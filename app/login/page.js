import Logo from "@/components/logo";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Logo size={30} />
        <p className="auth-tag">
          Meet someone. Scan. You're in each other's contacts.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
