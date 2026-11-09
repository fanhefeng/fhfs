TypeScript 5.0 开始支持基于 ECMAScript 提案的装饰器，通常称为标准装饰器。装饰器函数在定义类时调用，可以替换方法、转换字段初值，或安排初始化逻辑。像记录日志、统一返回值这类多个成员共享的行为，适合封装成命名明确的装饰器。

## 方法装饰器示例

这个例子把播放时长统一舍入到整毫秒。`wholeMilliseconds` 接收原方法并返回一个签名相同的函数。调用时，新函数把原来的 `this` 和参数传给原方法。

```ts
function wholeMilliseconds<This, Args extends unknown[]>(
  method: (this: This, ...args: Args) => number,
  _context: ClassMethodDecoratorContext<This, typeof method>,
) {
  return function (this: This, ...args: Args) {
    return Math.round(method.apply(this, args));
  };
}

class Clip {
  constructor(readonly framesPerSecond: number) {}

  @wholeMilliseconds
  duration(frames: number) {
    return (frames / this.framesPerSecond) * 1000;
  }
}

console.log(new Clip(24).duration(1)); // 42
```

## 类与成员怎么装饰

装饰器的第二个参数 `context` 描述被装饰的位置。`context.kind` 可以区分类、方法和字段等；成员的上下文还有 `static` 与 `private`。

| 位置 | 第一个参数 | 可以返回什么 |
| --- | --- | --- |
| 类 | 类本身 | 兼容原类型的替代构造函数，例如原类的子类 |
| 方法、getter、setter | 对应的函数 | 同类型的替换函数 |
| 字段 | `undefined` | 接收并转换初始值的函数 |
| `accessor` 声明 | 含 `get` 和 `set` 的对象 | 含 `get`、`set` 或 `init` 的对象，可只改其中一项 |

返回 `undefined` 表示保留被装饰的值，装饰器仍可安排额外的初始化逻辑。装饰器在运行时新增的成员需要在类型里显式声明，调用方才能通过类型检查。使用 `context.access` 时要传入目标对象，例如 `context.access.get(instance)`。不同种类的装饰器提供的读写方法不同。

## 初始化与顺序

- `context.addInitializer()` 注册的回调何时运行取决于装饰的位置。实例方法的回调在实例字段初始化前运行，适合绑定 `this`。静态方法的回调在静态字段初始化前运行，类装饰器的回调在静态字段初始化后运行。
- 同一成员叠放多个装饰器时，表达式从上往下求值，装饰函数从下往上应用。写在下面的那一个先处理原方法，写在上面的再处理结果。

[ECMAScript 装饰器提案中的初始化顺序](https://github.com/tc39/proposal-decorators#adding-initialization-logic-with-addinitializer)

## 和旧语法的区别

启用 `experimentalDecorators` 会使用旧版规则。标准装饰器只用于类和类成员，参数装饰器和 `emitDecoratorMetadata` 都属于旧版用法。迁移前先确认依赖使用的是哪套规则。[TypeScript 5.0 发布说明](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html#differences-with-experimental-legacy-decorators)
