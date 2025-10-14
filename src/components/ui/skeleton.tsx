import { HTMLAttributes } from 'react';

const Skeleton = ({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/5 ${className}`}
      {...props}
    />
  );
};

export { Skeleton };
