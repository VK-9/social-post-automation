import AuthSvg from "./auth-svg";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:flex w-2/5 h-screen items-center justify-center px-16">
        <div className="w-full max-w-lg h-[65vh]">
          <AuthSvg />
        </div>
      </div>
      <div className="flex w-full lg:w-3/5 flex-col lg:items-center lg:justify-center overflow-y-auto">
        <div className="lg:hidden w-full h-[34vh] min-h-[240px] mt-6 opacity-40">
          <AuthSvg />
        </div>
        <div className="flex items-start lg:items-center justify-center px-4 pb-8 pt-2 lg:px-16 w-full">
          <div className="w-full max-w-lg">{children}</div>
        </div>
      </div>
    </div>
  );
}
