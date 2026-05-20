import { useEffect, useState } from 'react';
import { User } from 'lucide-react';

export default function MemberAvatar({
  member,
  className,
  wrapperClassName,
  placeholderClassName,
  imgClassName,
  loading = 'lazy',
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const fullName = `${member?.firstName || ''} ${member?.lastName || ''}`.trim();
  const initials = `${member?.firstName?.[0] || ''}${member?.lastName?.[0] || ''}`.toUpperCase();
  const showImage = member?.photoURL && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [member?.photoURL]);

  function handleImageError() {
    console.error('[MemberAvatar] Member photo failed to load', {
      memberId: member?.id,
      photoPath: member?.photoPath,
      photoURL: member?.photoURL,
    });
    setImageFailed(true);
  }

  if (showImage) {
    const image = (
      <img
        src={member.photoURL}
        alt={fullName}
        className={imgClassName || className}
        loading={loading}
        onError={handleImageError}
      />
    );

    return wrapperClassName ? <div className={wrapperClassName}>{image}</div> : image;
  }

  return (
    <div className={placeholderClassName || className}>
      {initials || <User size={20} />}
    </div>
  );
}
