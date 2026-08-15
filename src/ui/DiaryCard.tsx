import { StyleSheet } from "react-native";

import { isOpenable, openInstant } from "../domain/capsuleRules";
import { formatKoreanDate } from "../domain/dates";
import type { Capsule, Diary } from "../domain/types";
import { AppText, Card } from "./primitives";
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
  /** 이 일기의 캡슐. 없으면(null/undefined) 일반 일기로 그린다. */
  capsule?: Capsule | null;
  /** 개봉 가능 판정 기준 시각 — 주로 테스트 주입용. 없으면 현재 시각. */
  now?: Date;
}

/**
 * 지난 여정 목록의 일기 카드. 통계·숫자 배지 없음 (Requirement 4).
 * - 일반/개봉된 일기: 날짜 + 제목(있을 때만) + 본문 미리보기 2줄.
 * - 봉인 중(캡슐 존재 && 미개봉): 제목·본문은 절대 그리지 않는다
 *   (Requirement 3 — 작성일과 개봉 예정일만). 개봉일 전에는 봉인 안내를,
 *   개봉일이 지나면 "열어볼 수 있어요" 배지를 보여 준다.
 */
export function DiaryCard({
  diary,
  onPress,
  capsule = null,
  now,
}: DiaryCardProps) {
  const sealed = capsule !== null && capsule.openedAt === null;

  if (sealed) {
    const openable = isOpenable(
      capsule.openDate,
      capsule.openedAt,
      now ?? new Date(),
    );
    const openLine = `🔒 봉인된 이야기 · ${formatKoreanDate(
      openInstant(capsule.openDate).toISOString(),
    )}에 열려요`;

    return (
      <Card
        onPress={onPress}
        radius="md"
        gap="sm"
        accessibilityLabel={`${formatKoreanDate(diary.createdAt)}의 봉인된 이야기`}
        style={styles.card}
      >
        <AppText variant="small" color="subtle">
          {formatKoreanDate(diary.createdAt)}
        </AppText>
        {openable ? (
          <AppText variant="small" color="accent" weight="semibold">
            열어볼 수 있어요
          </AppText>
        ) : (
          <AppText variant="small" color="subtle">
            {openLine}
          </AppText>
        )}
      </Card>
    );
  }

  return (
    <Card
      onPress={onPress}
      radius="md"
      gap="sm"
      accessibilityLabel={`${formatKoreanDate(diary.createdAt)}의 이야기`}
      style={styles.card}
    >
      <AppText variant="small" color="subtle">
        {formatKoreanDate(diary.createdAt)}
      </AppText>
      {diary.title !== null && diary.title.length > 0 && (
        <AppText variant="body" weight="semibold" numberOfLines={1}>
          {diary.title}
        </AppText>
      )}
      <AppText variant="bodyRelaxed" numberOfLines={2}>
        {previewOf(diary.content)}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: theme.touchTarget,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
});
