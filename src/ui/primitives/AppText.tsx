import { Text, type TextProps } from "react-native";

import {
  theme,
  type FontWeight,
  type ThemeColor,
  type TypographyVariant,
} from "../theme";

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: ThemeColor;
  weight?: FontWeight;
  center?: boolean;
}

/**
 * 모든 UI 텍스트의 단일 진입점. variant(크기·행간)·color·weight는 전부
 * 테마 토큰이라 리디자인 시 theme.ts만 바꾸면 전 화면이 함께 바뀐다.
 * (일기 본문처럼 사용자가 고른 DiaryStyle로 그리는 텍스트만 예외.)
 */
export function AppText({
  variant = "body",
  color = "ink",
  weight = "regular",
  center = false,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      style={[
        theme.typography[variant],
        {
          color: theme.colors[color],
          fontWeight: theme.fontWeight[weight],
        },
        center && { textAlign: "center" },
        style,
      ]}
      {...rest}
    />
  );
}
