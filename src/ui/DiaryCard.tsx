import { Pressable, StyleSheet, Text } from "react-native";

import { formatKoreanDate } from "../domain/dates";
import type { Diary } from "../domain/types";
import { theme } from "./theme";

const PREVIEW_LENGTH = 40;

/** 본문 미리보기 — 줄바꿈·연속 공백을 접고 앞 40자만. */
function previewOf(content: string): string {
  const collapsed = content.trim().replace(/\s+/g, " ");
  return collapsed.length > PREVIEW_LENGTH
    ? `${collapsed.slice(0, PREVIEW_LENGTH)}…`
    : collapsed;
}

interface DiaryCardProps {
  diary: Diary;
  onPress: () => void;
}

/**
 * 지난 여정 목록의 일기 카드: 날짜("YYYY년 M월 D일") + 제목(있을 때만) +
 * 본문 미리보기 2줄. 통계·숫자 배지 없음 (Requirement 4).
 */
export function DiaryCard({ diary, onPress }: DiaryCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${formatKoreanDate(diary.createdAt)}의 이야기`}
      onPress={onPress}
      style={styles.card}
    >
      <Text style={styles.date}>{formatKoreanDate(diary.createdAt)}</Text>
      {diary.title !== null && diary.title.length > 0 && (
        <Text style={styles.title} numberOfLines={1}>
          {diary.title}
        </Text>
      )}
      <Text style={styles.preview} numberOfLines={2}>
        {previewOf(diary.content)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: theme.touchTarget,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 6,
  },
  date: {
    fontSize: theme.fontSize.small,
    color: theme.colors.subtle,
  },
  title: {
    fontSize: theme.fontSize.body,
    color: theme.colors.ink,
    fontWeight: "600",
  },
  preview: {
    fontSize: theme.fontSize.body,
    color: theme.colors.ink,
    lineHeight: 30,
  },
});
