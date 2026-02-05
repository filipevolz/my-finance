import styled from 'styled-components';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { DialogTitle } from '@/components/ui/dialog';

export const CardsWrapper = styled.div`
  min-height: 100vh;
  background-color: ${(props) => props.theme.background};
  display: flex;
  flex-direction: column;
`;

export const CardsMain = styled.main`
  flex: 1;
  padding: 2rem;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

export const CardsContent = styled.section`
  max-width: 75rem;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

export const PageHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`;

export const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: ${(props) => props.theme.text};
  line-height: 1.2;
`;

export const PageDescription = styled.p`
  font-size: 1rem;
  font-weight: 400;
  color: ${(props) => props.theme.textSecondary};
  margin: 0;
  line-height: 1.5;
`;

export const AddButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
`;

export const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const CardItem = styled.article`
  background-color: ${(props) => props.theme.surface};
  border: 0.0625rem solid ${(props) => props.theme.border};
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.2s;
  box-shadow: 0 0.125rem 0.25rem ${(props) => props.theme.shadow};
`;

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
`;

export const CardNickname = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${(props) => props.theme.text};
`;

export const CardDefaultBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  background-color: ${(props) => props.theme.primary}20;
  color: ${(props) => props.theme.primary};
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
`;

export const CardActions = styled.button`
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  background: transparent;
  border: none;
  color: ${(props) => props.theme.textSecondary};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.surfaceSecondary};
    color: ${(props) => props.theme.text};
  }

  &:focus-visible {
    outline: 0.125rem solid ${(props) => props.theme.primary};
    outline-offset: 0.125rem;
  }
`;

export const CardInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const CardInfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

export const CardInfoLabel = styled.span`
  font-size: 0.875rem;
  font-weight: 400;
  color: ${(props) => props.theme.textSecondary};
`;

export const CardInfoValue = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${(props) => props.theme.text};
`;

export const AddCardButton = styled.button`
  background-color: ${(props) => props.theme.surface};
  border: 0.125rem dashed ${(props) => props.theme.border};
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 12rem;
  transition: all 0.2s;
  box-shadow: 0 0.125rem 0.25rem ${(props) => props.theme.shadow};
  cursor: pointer;
  color: ${(props) => props.theme.textSecondary};

  &:hover {
    border-color: ${(props) => props.theme.primary};
    background-color: ${(props) => props.theme.primary}10;
    color: ${(props) => props.theme.primary};
    transform: translateY(-0.125rem);
    box-shadow: 0 0.25rem 0.5rem ${(props) => props.theme.shadow};
  }

  &:focus-visible {
    outline: 0.125rem solid ${(props) => props.theme.primary};
    outline-offset: 0.125rem;
  }

  span {
    font-size: 0.875rem;
    font-weight: 600;
  }
`;

export const StyledInput = styled(Input)<{ $error?: boolean }>`
  padding: 1.25rem 1rem;

  &[type='number'] {
    -moz-appearance: textfield;
    appearance: textfield;
  }

  &[type='number']::-webkit-inner-spin-button,
  &[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  ${(props) =>
    props.$error &&
    `
    border-color: ${props.theme.error};
    &:focus-visible {
      border-color: ${props.theme.error};
      ring-color: ${props.theme.error};
    }
  `}
`;

export const ModalForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  input[type='checkbox'] {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
  }
`;

export const CheckboxLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 400;
  color: ${(props) => props.theme.text};
  cursor: pointer;
  user-select: none;
`;

export const ErrorMessage = styled.span`
  color: ${(props) => props.theme.error};
  font-size: 0.875rem;
  margin-top: 0.25rem;
`;

export const SubmitButton = styled(Button)`
  width: 100%;
  margin-top: 0.5rem;
`;

export const StyledDialogContent = styled(DialogPrimitive.Content)`
  padding: 2rem;
  max-width: 32rem;
  width: calc(100% - 2rem);
  background-color: ${(props) => props.theme.surface};
  border-radius: 0.75rem;
  border: 0.0625rem solid ${(props) => props.theme.border};
  box-shadow: 0 0.25rem 0.5rem ${(props) => props.theme.shadow};
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 50;
  outline: none;
  display: flex;
  flex-direction: column;
`;

export const StyledDialogHeader = styled.div``;

export const StyledDialogTitle = styled(DialogTitle)`
  font-size: 1rem;
  font-weight: 700;
  color: ${(props) => props.theme.text};
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
`;

export const StyledDialogDescription = styled.p`
  font-size: 0.875rem;
  font-weight: 400;
  color: ${(props) => props.theme.textSecondary};
  margin: 0;
  line-height: 1.5;
`;

export const StyledLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${(props) => props.theme.text};
`;

export const StyledDialogClose = styled(DialogPrimitive.Close)`
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  background: transparent;
  border: none;
  color: ${(props) => props.theme.textSecondary};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${(props) => props.theme.surfaceSecondary};
    color: ${(props) => props.theme.text};
  }

  &:focus-visible {
    outline: 0.125rem solid ${(props) => props.theme.primary};
    outline-offset: 0.125rem;
  }
`;
