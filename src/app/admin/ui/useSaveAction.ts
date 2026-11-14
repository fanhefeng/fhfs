"use client";

import {
  startTransition,
  useActionState,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { unstable_rethrow } from "@/lib/navigation";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import type { ActionState } from "../actions/shared";

type SaveAction = (prev: ActionState, form: FormData) => Promise<ActionState>;

const FAILED: ActionState = {
  error: "没保存上：数据库或网络没有应答。这一页的内容还在，稍等一下再按一次保存。",
};

/**
 * `useActionState` for a save form, minus the two things it does that a save
 * form cannot afford. Both end the same way: the article typed since the last
 * save is gone.
 *
 * It resets. React resets a `<form action={fn}>` once `fn` settles — and a
 * returned error is settled. Every field here is uncontrolled, so that reset
 * puts back the last *saved* text: a session that ran out, a date that is not
 * a day, a key already taken, under a line that says the text is still there.
 * So the submit is taken by hand. A submit event that arrives already
 * `preventDefault`ed makes React skip the action (and the reset that rides on
 * it), and the dispatch goes out in a transition started here, which is what
 * keeps `pending` and `useFormStatus` working. `action` stays on the form for
 * the submit that lands before hydration.
 *
 * It throws. An action that *throws* — the database not answering is the one
 * that happens — takes the error to the boundary, and the boundary replaces
 * the editor. Caught here instead and turned into the same line beside the
 * button. `useServerFn` handles server redirects; other router signals pass
 * through `unstable_rethrow`.
 *
 * SaveFields locks editing while pending, after this hook takes FormData, so
 * neither the refresh nor reset can discard a newer edit. The reset still
 * happens where it was wanted: on `ok`. The inline "new" row
 * under a list goes blank for the next one, and an edit form picks up what
 * the server made of the values — by then the refreshed props are in, so the
 * defaults it resets to are the saved ones.
 */
export function useSaveAction(action: SaveAction) {
  const invoke = useServerFn(action);
  const router = useRouter();
  // React paints pending on the next render; reject a second submit even if
  // it arrives synchronously before that render disables the fields/buttons.
  const submitting = useRef(false);
  const focusedBeforeSave = useRef<HTMLElement | null>(null);
  const guarded = useCallback<SaveAction>(
    async (prev, form) => {
      try {
        const result = await invoke(prev, form);
        if (result?.ok) await router.invalidate();
        return result ?? {};
      } catch (error) {
        unstable_rethrow(error);
        console.error(error);
        return FAILED;
      }
    },
    [invoke, router],
  );
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(guarded, {});
  const formRef = useRef<HTMLFormElement | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [cancelled, setCancelled] = useState(false);
  const resettingAfterSave = useRef(false);

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (submitting.current) return;
      const form = event.currentTarget;
      setUploadError("");
      setCancelled(false);
      if (form.querySelector('[data-upload-pending="true"]')) {
        setUploadError("文件还在上传，完成后再保存。");
        return;
      }
      formRef.current = form;
      const { submitter } = event.nativeEvent as SubmitEvent;
      const data = new FormData(form, submitter);
      const focused = form.ownerDocument.activeElement;
      focusedBeforeSave.current =
        focused instanceof HTMLElement && form.contains(focused) ? focused : null;
      submitting.current = true;
      startTransition(() => dispatch(data));
    },
    [dispatch],
  );

  useLayoutEffect(() => {
    if (pending) return;
    if (state.ok) {
      resettingAfterSave.current = true;
      formRef.current?.reset();
      resettingAfterSave.current = false;
    }
    // Reset and unlock settle in the same commit, before the reader can type
    // into the newly enabled fields. Errors unlock without resetting.
    submitting.current = false;
    const focused = focusedBeforeSave.current;
    focusedBeforeSave.current = null;
    if (focused?.isConnected && focused.ownerDocument.activeElement === focused.ownerDocument.body)
      focused.focus({ preventScroll: true });
  }, [pending, state]);

  return {
    state: cancelled ? {} : uploadError ? { error: uploadError } : state,
    pending,
    formProps: {
      action: dispatch,
      onSubmit,
      onResetCapture: (event: FormEvent<HTMLFormElement>) => {
        if (submitting.current && !resettingAfterSave.current) {
          // A script-triggered reset must not change rows/custom selects while
          // a save is in flight either; stop it before their native listeners.
          event.preventDefault();
          event.stopPropagation();
        }
      },
      onReset: () => {
        if (!resettingAfterSave.current) {
          setCancelled(true);
          setUploadError("");
        }
      },
    },
  };
}
