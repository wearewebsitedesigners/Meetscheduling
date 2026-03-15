export default function Container({ className = "", children }) {
  return <div className={`mx-auto w-[min(1200px,calc(100%-2rem))] ${className}`}>{children}</div>;
}
