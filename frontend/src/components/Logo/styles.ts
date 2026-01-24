import styled from 'styled-components';

export const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

export interface LogoImageProps {
  $size: number;
}

export const LogoImage = styled.img<LogoImageProps>`
  height: ${(props) => `${props.$size}rem`};
  width: auto;
  margin-right: 0.5rem;
`;

export interface LogoTextProps {
  $fontSize: number;
}

export const LogoText = styled.h1<LogoTextProps>`
  font-size: ${(props) => `${props.$fontSize}rem`};
  font-weight: 600;

  .my {
    color: #4ade80;
  }

  .finance {
    color: #3b82f6;
  }
`;
