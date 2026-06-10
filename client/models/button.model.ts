export type ButtonProps =
  | {
      isLink: true;
      linkHref: string;
      text: string;
      type?: never;
    }
  | {
      isLink: false;
      type: "submit" | "button";
      text: string;
      linkHref?: never;
    };
