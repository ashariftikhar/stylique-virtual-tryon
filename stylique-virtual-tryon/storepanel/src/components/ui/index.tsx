// Simple UI components for forms

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: any) {
  const variants: Record<string, string> = {
    primary: 'bg-[#642FD7] hover:bg-[#542FCF] text-white',
    secondary: 'bg-gray-800 hover:bg-gray-700 text-white',
    danger: 'bg-red-900/20 hover:bg-red-900/30 text-red-300 border border-red-900/50',
  };

  return (
    <button
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${variants[variant] ?? ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = '', ...props }: any) {
  return (
    <input
      className={`px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7] ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = '', ...props }: any) {
  return (
    <textarea
      className={`px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#642FD7] ${className}`}
      {...props}
    />
  );
}

export function Card({
  children,
  className = '',
  ...props
}: any) {
  return (
    <div
      className={`rounded-2xl bg-gray-900/50 border border-gray-800 p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  variant = 'default',
  className = '',
}: any) {
  const variants: Record<string, string> = {
    default: 'bg-gray-800 text-gray-300',
    primary: 'bg-[#642FD7]/20 text-[#B4A5E0]',
    success: 'bg-green-900/20 text-green-300',
    danger: 'bg-red-900/20 text-red-300',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${variants[variant] ?? ''} ${className}`}
    >
      {children}
    </span>
  );
}
