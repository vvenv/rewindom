import { Logo, Wordmark } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { Link, useNavigate } from "react-router";

export function RegisterDisabledView() {
  const navigate = useNavigate();

  return (
    <div className="auth-glass-card relative overflow-hidden rounded-2xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent dark:via-primary/50"
      />

      <div className="relative p-8 sm:p-10">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo className="auth-logo-glow h-14 w-14 text-primary" />
          <div className="flex flex-col items-center gap-2">
            <Wordmark className="auth-logo-glow h-6 text-foreground" />
            <p className="mt-1 text-sm text-muted-foreground">
              暂未开放自助注册
            </p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">
            请联系平台管理员开通账号，或返回登录页面
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/login")}
          >
            返回登录
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RegisterLoginLink() {
  return (
    <p className="mt-8 text-center text-sm text-muted-foreground">
      已有账号？{" "}
      <Link to="/login" className="text-primary hover:underline">
        立即登录
      </Link>
    </p>
  );
}
