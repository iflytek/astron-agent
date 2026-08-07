// jQuery 专用类型声明文件
declare module 'jquery' {
  interface JQueryEvent<TTarget = HTMLElement> extends Event {
    target: TTarget;
    currentTarget: HTMLElement;
    data?: unknown;
  }

  interface JQuery<TElement = HTMLElement> {
    off(events?: string): this;
    on<TTarget = HTMLElement>(
      events: string,
      handler: (this: TElement, event: JQueryEvent<TTarget>) => void
    ): this;
  }

  interface JQueryStatic {
    <T extends Element = HTMLElement>(
      selector: string | Element | NodeList | T[]
    ): JQuery<T>;
  }

  const $: JQueryStatic;
  export default $;
}
