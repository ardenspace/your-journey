import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { theme, type SpacingKey } from "../theme";

/**
 * 읽기 폭 제한 프레임 — 화면 콘텐츠와 FlatList contentContainerStyle이
 * 함께 쓴다 (태블릿에서 본문이 한없이 넓어지지 않게).
 */
export const contentFrame: ViewStyle = {
  width: "100%",
  maxWidth: theme.maxContentWidth,
  alignSelf: "center",
};

interface ScreenProps {
  /** ScrollView + 콘텐츠 프레임으로 감싼다. */
  scroll?: boolean;
  /** iOS에서 키보드를 피한다 (쓰기·수정 화면). */
  keyboardAvoiding?: boolean;
  /** 스크롤 콘텐츠를 세로 중앙에 (홈처럼 짧은 화면). */
  verticalCenter?: boolean;
  /** 스크롤 콘텐츠가 화면 높이를 채운다 (열람처럼 종이가 끝까지 닿게). */
  stretch?: boolean;
  /** 비어 있음·봉인 안내처럼 화면 정중앙에 몇 줄만 놓을 때. */
  centered?: boolean;
  /** 콘텐츠 패딩 토큰. scroll 기본 xl(20), non-scroll 기본 없음. */
  padding?: SpacingKey;
  /** 콘텐츠 프레임의 자식 간 간격 토큰. */
  gap?: SpacingKey;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * 모든 화면의 바깥 껍데기: 종이 배경 + (선택) 스크롤/키보드 회피 +
 * 읽기 폭 제한. 화면들은 이 안에 내용만 놓는다 — 배경색·패딩 체계를
 * 바꿀 일이 생기면 여기와 theme.ts만 바꾼다.
 */
export function Screen({
  scroll = false,
  keyboardAvoiding = false,
  verticalCenter = false,
  stretch = false,
  centered = false,
  padding,
  gap,
  style,
  children,
}: ScreenProps) {
  const gapStyle = gap !== undefined && { gap: theme.spacing[gap] };

  if (scroll) {
    const body = (
      <ScrollView
        contentContainerStyle={[
          {
            padding: theme.spacing[padding ?? "xl"],
            paddingBottom: theme.spacing.huge,
          },
          (verticalCenter || stretch) && styles.grow,
          verticalCenter && styles.verticalCenter,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[contentFrame, stretch && styles.grow, gapStyle]}>
          {children}
        </View>
      </ScrollView>
    );
    if (keyboardAvoiding) {
      return (
        <KeyboardAvoidingView
          style={[styles.screen, style]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      );
    }
    return <View style={[styles.screen, style]}>{body}</View>;
  }

  return (
    <View
      style={[
        styles.screen,
        padding !== undefined && { padding: theme.spacing[padding] },
        centered && styles.centered,
        gapStyle,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  grow: {
    flexGrow: 1,
  },
  verticalCenter: {
    justifyContent: "center",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
});
