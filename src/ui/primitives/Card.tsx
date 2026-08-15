import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { theme, type RadiusKey, type SpacingKey } from "../theme";

interface CardProps extends Omit<PressableProps, "style" | "children"> {
  radius?: RadiusKey;
  /** 균일 패딩. 비대칭이 필요하면 style로 덮어쓴다 (토큰 값으로). */
  padding?: SpacingKey;
  gap?: SpacingKey;
  /** 주어지면 Pressable 카드가 된다 (일기 카드처럼 통째로 누르는 카드). */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * 흰 종이 카드 표면. 배경·모서리·패딩이 여기와 theme.ts에만 있다.
 * onPress가 있으면 접근성 role=button인 Pressable로 그린다.
 */
export function Card({
  radius = "md",
  padding = "lg",
  gap,
  onPress,
  style,
  children,
  ...rest
}: CardProps) {
  const surface: StyleProp<ViewStyle> = [
    styles.surface,
    {
      borderRadius: theme.radius[radius],
      padding: theme.spacing[padding],
    },
    gap !== undefined && { gap: theme.spacing[gap] },
    style,
  ];

  if (onPress !== undefined) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={surface}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={surface}>{children}</View>;
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: theme.colors.card,
  },
});
