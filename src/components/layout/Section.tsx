/**
 * Секция контента с заголовком
 */

interface SectionProps {
  title?: string;
  titleColor?: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, titleColor, children, className = "" }: SectionProps) {
  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      {title && (
        <h2 className={`text-2xl font-bold mb-4 ${titleColor || "text-gray-900"}`}>
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
