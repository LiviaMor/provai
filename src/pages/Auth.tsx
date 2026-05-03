import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Mail, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "@/hooks/use-toast";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.06-1.1-.16-1.6H12z"/>
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState<"login" | "signup" | "google" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) navigate("/analise", { replace: true });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/analise", { replace: true });
      else setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("login");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(null);
    if (error) {
      const msg = error.message.toLowerCase().includes("invalid")
        ? "E-mail ou senha incorretos."
        : error.message.toLowerCase().includes("not confirmed")
        ? "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada."
        : error.message;
      toast({ title: "Não foi possível entrar", description: msg, variant: "destructive" });
      return;
    }
    navigate("/analise", { replace: true });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("signup");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/analise`,
        data: { full_name: name || undefined },
      },
    });
    setBusy(null);
    if (error) {
      const msg = error.message.toLowerCase().includes("already")
        ? "Este e-mail já está cadastrado. Tente fazer login."
        : error.message;
      toast({ title: "Não foi possível cadastrar", description: msg, variant: "destructive" });
      return;
    }
    toast({
      title: "Confirme seu e-mail",
      description: "Enviamos um link de confirmação. Abra seu e-mail para ativar a conta.",
    });
  };

  const handleGoogle = async () => {
    setBusy("google");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/analise`,
    });
    if (result.error) {
      setBusy(null);
      toast({
        title: "Falha no login com Google",
        description: result.error.message ?? "Tente novamente.",
        variant: "destructive",
      });
      return;
    }
    if (result.redirected) return;
    navigate("/analise", { replace: true });
  };

  // Dev/demo login — cria ou loga com admin@provai.app / admin123
  const handleDevLogin = async () => {
    const devEmail = "admin@provai.app";
    const devPassword = "admin123";
    setBusy("login");

    // Tenta logar primeiro
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: devEmail,
      password: devPassword,
    });

    if (!loginError) {
      navigate("/analise", { replace: true });
      setBusy(null);
      return;
    }

    // Se não existe, cria a conta (signUp com autoConfirm depende do config do Supabase)
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: devEmail,
      password: devPassword,
      options: { data: { full_name: "Admin Demo" } },
    });

    if (signupError) {
      setBusy(null);
      toast({
        title: "Erro no login demo",
        description: signupError.message,
        variant: "destructive",
      });
      return;
    }

    // Se o signup retornou sessão (auto-confirm habilitado), já está logado
    if (signupData?.session) {
      navigate("/analise", { replace: true });
      setBusy(null);
      return;
    }

    // Se precisa confirmar email, tenta logar mesmo assim (alguns projetos permitem)
    const { error: retryError } = await supabase.auth.signInWithPassword({
      email: devEmail,
      password: devPassword,
    });

    setBusy(null);
    if (retryError) {
      toast({
        title: "Confirmação de email necessária",
        description: "Desative 'Confirm email' no Supabase Dashboard → Authentication → Providers → Email. Ou use um email real para criar conta.",
      });
      return;
    }
    navigate("/analise", { replace: true });
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-app-radial grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-radial flex flex-col">
      <header className="px-4 pt-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </header>

      <main className="flex-1 grid place-items-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="bg-card/80 backdrop-blur shadow-panel border-border">
            <CardHeader className="text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center mb-2">
                <Sparkles className="h-6 w-6" />
              </div>
              <CardTitle className="font-display text-2xl">Sua conta provAI</CardTitle>
              <CardDescription>Acesse seu histórico, coloração e favoritos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full"
                onClick={handleGoogle}
                disabled={!!busy}
              >
                {busy === "google" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continuar com Google
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="w-full rounded-full mt-2"
                onClick={handleDevLogin}
                disabled={!!busy}
              >
                {busy === "login" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Demo rápido (admin@provai.app)
              </Button>

              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px bg-border flex-1" />
                ou com e-mail
                <div className="h-px bg-border flex-1" />
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid grid-cols-2 w-full mb-4">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar conta</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-email">E-mail</Label>
                      <div className="relative">
                        <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          required
                          autoComplete="email"
                          className="pl-9"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="login-pass">Senha</Label>
                      <div className="relative">
                        <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="login-pass"
                          type="password"
                          required
                          autoComplete="current-password"
                          className="pl-9"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full rounded-full" disabled={!!busy}>
                      {busy === "login" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Entrar
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-name">Nome (opcional)</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-email">E-mail</Label>
                      <div className="relative">
                        <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          required
                          autoComplete="email"
                          className="pl-9"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-pass">Senha</Label>
                      <div className="relative">
                        <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="signup-pass"
                          type="password"
                          required
                          minLength={6}
                          autoComplete="new-password"
                          className="pl-9"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">Mínimo 6 caracteres.</p>
                    </div>
                    <Button type="submit" className="w-full rounded-full" disabled={!!busy}>
                      {busy === "signup" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Criar conta
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center">
                      Você receberá um e-mail de confirmação para ativar a conta.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Auth;
