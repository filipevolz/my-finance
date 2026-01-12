import styled from 'styled-components';

export const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background-color: #121212;
`;

export const LoginCard = styled.div`
  width: 100%;
  max-width: 28rem;
  background-color: #1e1e1e;
  border-radius: 0.75rem;
  padding: 2.5rem;
  box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.3);
`;

export const LogoWrapper = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
`;

export const Title = styled.h2`
  color: #fff;
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  text-align: center;
`;

export const Subtitle = styled.p`
  color: #a0a0a0;
  font-size: 0.875rem;
  margin: 0 0 2rem 0;
  text-align: center;
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Label = styled.label`
  color: #e0e0e0;
  font-size: 0.875rem;
  font-weight: 500;
`;

export const Input = styled.input<{ $error?: boolean }>`
  background-color: #2a2a2a;
  border: 0.0625rem solid ${(props) => (props.$error ? '#ef4444' : '#3a3a3a')};
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  color: #fff;
  font-size: 1rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${(props) => (props.$error ? '#ef4444' : '#3b82f6')};
  }

  &::placeholder {
    color: #6a6a6a;
  }
`;

export const ErrorMessage = styled.span`
  color: #ef4444;
  font-size: 0.75rem;
  margin-top: 0.25rem;
`;

export const SubmitButton = styled.button`
  background-color: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 0.5rem;

  &:hover:not(:disabled) {
    background-color: #2563eb;
  }

  &:active:not(:disabled) {
    background-color: #1d4ed8;
  }

  &:disabled {
    background-color: #3a3a3a;
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

export const RegisterLink = styled.div`
  margin-top: 1.5rem;
  text-align: center;
  color: #a0a0a0;
  font-size: 0.875rem;

  a {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;

    &:hover {
      color: #60a5fa;
      text-decoration: underline;
    }
  }
`;
