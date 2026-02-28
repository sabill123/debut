export type MvTeaserProps = {
  clips: Array<{
    src: string;
    transition: "fade" | "slide" | "wipe" | "dissolve";
  }>;
  bgmUrl: string | null;
  opening: {
    title: string;
    imageUrl: string | null;
  };
  closing: {
    title: string;
    imageUrl: string | null;
  };
};
