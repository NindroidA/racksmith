import { HTMLAttributes } from 'react';

const Skeleton = ({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={`animate-pulse rounded-md ${className}`}
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
      {...props}
    />
  );
};

export { Skeleton };
