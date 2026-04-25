type Props = {
  imageUrl: string | null;
  label: string;
  onClose: () => void;
};

export function FullscreenImageDialog({ imageUrl, label, onClose }: Props) {
  if (!imageUrl) {
    return null;
  }

  const imageStyle = { backgroundImage: `url("${imageUrl.replace(/["\\]/g, '\\$&')}")` };

  return (
    <div
      className="fullscreen-image-dialog"
      role="presentation"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <section className="fullscreen-image-card" role="dialog" aria-modal="true" aria-label={label} onClick={(event) => event.stopPropagation()}>
        <div className="fullscreen-image-surface" role="img" aria-label={label} style={imageStyle} />
        <button className="fullscreen-close quiet-button" type="button" onClick={onClose}>关闭</button>
      </section>
    </div>
  );
}
