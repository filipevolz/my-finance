import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../contexts/AuthContext';
import {
  LoginContainer,
  LoginCard,
  LogoWrapper,
  Title,
  Subtitle,
  Form,
  FormGroup,
  Label,
  Input,
  ErrorMessage,
  SubmitButton,
  RegisterLink,
} from './styles';

const loginSchema = z.object({
  emailOrPhone: z.string().min(1, 'E-mail ou telefone é obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await login(data);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Erro ao fazer login');
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <LogoWrapper>
          <Logo size="large" />
        </LogoWrapper>
        <Title>Bem-vindo de volta</Title>
        <Subtitle>Faça login para continuar</Subtitle>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormGroup>
            <Label htmlFor="emailOrPhone">E-mail ou Telefone</Label>
            <Input
              id="emailOrPhone"
              type="text"
              placeholder="seu@email.com ou (11) 99999-9999"
              $error={!!errors.emailOrPhone}
              {...register('emailOrPhone')}
            />
            {errors.emailOrPhone && (
              <ErrorMessage>{errors.emailOrPhone.message}</ErrorMessage>
            )}
          </FormGroup>
          <FormGroup>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              $error={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <ErrorMessage>{errors.password.message}</ErrorMessage>
            )}
          </FormGroup>
          <SubmitButton type="submit" disabled={isLoading}>
            {isLoading ? 'Carregando...' : 'Entrar'}
          </SubmitButton>
        </Form>
        <RegisterLink>
          Não tem uma conta? <Link to="/register">Cadastre-se</Link>
        </RegisterLink>
      </LoginCard>
    </LoginContainer>
  );
}
