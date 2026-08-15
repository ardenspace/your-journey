import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, View } from "react-native";
import { Calendar } from "react-native-calendars";

import { QUESTION_BANK } from "@/content/questions";
import { newId, useDb } from "@/db/provider";
import {
  isValidCustomOpenDate,
  openInstant,
  resolveOpenDate,
  type CapsulePreset,
} from "@/domain/capsuleRules";
import { formatKoreanDate, localDateString } from "@/domain/dates";
import { currentQuestion, markAnswered } from "@/domain/questionEngine";
import type { Capsule, DiaryStyle } from "@/domain/types";
import { scheduleCapsuleNotification } from "@/notifications/capsuleNotifications";
import { sealDiary, setNotificationId } from "@/repositories/capsuleRepository";
import { createDiary } from "@/repositories/diaryRepository";
import {
  getLastStyle,
  getQuestionState,
  saveLastStyle,
  saveQuestionState,
} from "@/repositories/settingsRepository";
import { DiaryEditor } from "@/ui/DiaryEditor";
import { AppText, Button, Card, Chip, Screen } from "@/ui/primitives";
import { theme } from "@/ui/theme";

/**
 * 쓰기 화면 (Requirement 1): 제목 선택 + 본문 필수, 꾸미기(StylePicker),
 * "간직하기"로 저장. 빈 본문(공백·개행만)은 조용히 저장되지 않는다 —
 * 버튼이 비활성 상태로 있을 뿐 어떤 에러도 띄우지 않는다.
 * 마지막 꾸미기(last_style)가 기본값이며 저장이 완료된 때에만 갱신된다.
 *
 * 선택한 속지(무지/줄노트/모눈)는 NotebookPage가 입력창 배경에 그대로
 * 보여 준다 — 종이 일기장처럼 쓰는 동안에도 꾸미기가 눈에 들어온다.
 * questionId/questionText 파라미터는 Phase 2의 질문 카드가 넘겨준다 —
 * 지금은 있으면 표시·연결만 한다.
 *
 * 타임캡슐 봉인 (Requirement 3): 봉인은 저장 시점에만 선택할 수 있다.
 * 프리셋(한 달/세 달/여섯 달/일 년 뒤) 또는 캘린더에서 직접 고른 날짜
 * (내일 이후, 상한 없음 — 원칙 2). 캡슐 쓰기 실패는 조용히 삼킨다 —
 * 일기는 일반 일기로 남는다(트랜잭션 없음, 허용된 동작). 알림 실패도
 * 봉인을 막지 않는다(목록에서 그대로 개봉 가능).
 */

type SealPeriod = CapsulePreset | "custom";

const PRESET_OPTIONS: { preset: CapsulePreset; label: string }[] = [
  { preset: "1m", label: "한 달 뒤" },
  { preset: "3m", label: "세 달 뒤" },
  { preset: "6m", label: "여섯 달 뒤" },
  { preset: "1y", label: "일 년 뒤" },
];

/** "YYYY년 M월 D일에 열어요" — 로컬 달력일 그대로 (openInstant 경유). */
function openDateLabel(openDate: string): string {
  return `${formatKoreanDate(openInstant(openDate).toISOString())}에 열어요`;
}

export default function Write() {
  const db = useDb();
  const router = useRouter();
  const params = useLocalSearchParams<{
    questionId?: string;
    questionText?: string;
  }>();
  const questionId =
    typeof params.questionId === "string" ? params.questionId : undefined;
  const questionText =
    typeof params.questionText === "string" ? params.questionText : undefined;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [style, setStyle] = useState<DiaryStyle | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [sealOn, setSealOn] = useState(false);
  const [sealPeriod, setSealPeriod] = useState<SealPeriod | null>(null);
  const [customDate, setCustomDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lastStyle = await getLastStyle(db);
      if (!cancelled) {
        setStyle(lastStyle);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  // 마지막 꾸미기를 읽어 오기 전에는 조용한 빈 화면 (순간이라 거의 안 보인다).
  if (style === null) {
    return <Screen />;
  }

  // 봉인이 켜져 있으면 개봉 시기가 정해져야 저장할 수 있다.
  const sealReady =
    !sealOn ||
    (sealPeriod !== null && (sealPeriod !== "custom" || customDate !== null));
  const canSave = content.trim().length > 0 && sealReady && !saving;

  const today = localDateString(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = localDateString(tomorrowDate);

  const handleToggleSeal = (on: boolean) => {
    setSealOn(on);
    if (!on) {
      // 봉인을 끄면 시기 선택도 처음으로 — 꺼진 채 저장하면 일반 일기.
      setSealPeriod(null);
      setCustomDate(null);
    }
  };

  const handlePickCustomDate = (dateString: string) => {
    // UI(minDate)와 도메인 규칙(isValidCustomOpenDate) 이중 확인.
    if (isValidCustomOpenDate(dateString, localDateString(new Date()))) {
      setCustomDate(dateString);
    }
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    setSaveFailed(false);
    try {
      const trimmedTitle = title.trim();
      const diary = await createDiary(
        db,
        {
          title: trimmedTitle.length > 0 ? trimmedTitle : undefined,
          content,
          questionId,
          style,
        },
        { id: newId(), now: new Date().toISOString() },
      );
      await saveLastStyle(db, style);
      if (questionId !== undefined) {
        // 질문에서 시작한 일기: 저장된 질문이 아직 현재 커서 질문일 때만
        // answered로 마킹한다 — 쓰는 도중 자정이 지나 커서가 다음 질문으로
        // 넘어갔다면 연결(question_id)만 유지하고 마킹하지 않는다 (Req 2).
        // 일기는 이미 저장됐으므로 여기 실패는 조용히 넘어간다.
        try {
          const questionState = await getQuestionState(db);
          if (currentQuestion(QUESTION_BANK, questionState)?.id === questionId) {
            await saveQuestionState(db, markAnswered(questionState));
          }
        } catch {
          // 조용한 축소 — 질문 진행 마킹 실패가 저장 경험을 방해하지 않는다.
        }
      }

      // 봉인: 개봉일은 봉인 시점에 한 번 계산되어 저장된다 (B5).
      let sealedCapsule: Capsule | null = null;
      if (sealOn && sealPeriod !== null) {
        const now = new Date();
        const openDate =
          sealPeriod === "custom"
            ? customDate !== null &&
              isValidCustomOpenDate(customDate, localDateString(now))
              ? customDate
              : null
            : resolveOpenDate(now, sealPeriod);
        if (openDate !== null) {
          try {
            sealedCapsule = await sealDiary(db, diary.id, openDate, {
              id: newId(),
              now: now.toISOString(),
            });
          } catch {
            // 캡슐 쓰기 실패 → 일기는 일반 일기로 남는다 (부분 실패 허용).
            sealedCapsule = null;
          }
          if (sealedCapsule !== null) {
            // 알림은 봉인의 부속물 — 실패해도 봉인은 유지된다.
            try {
              const notifId = await scheduleCapsuleNotification(
                diary.id,
                openDate,
              );
              if (notifId !== null) {
                await setNotificationId(db, sealedCapsule.id, notifId);
              }
            } catch {
              // 조용한 축소 — 목록에서 그대로 개봉할 수 있다.
            }
          }
        }
      }

      if (sealedCapsule !== null) {
        Alert.alert("봉인되었어요", "때가 되면 조용히 알려드릴게요.", [
          { text: "네", onPress: () => router.back() },
        ]);
      } else {
        router.back();
      }
    } catch {
      // 저장 실패는 부드럽게 안내만 — 기술 용어·에러 코드 없음.
      setSaving(false);
      setSaveFailed(true);
    }
  };

  return (
    <Screen scroll keyboardAvoiding gap="xl">
      {questionText !== undefined && (
        <Card radius="sm" padding="lg">
          <AppText variant="bodyRelaxed">{questionText}</AppText>
        </Card>
      )}

      <DiaryEditor
        title={title}
        onTitleChange={setTitle}
        content={content}
        onContentChange={setContent}
        style={style}
        onStyleChange={setStyle}
      />

      <Card radius="sm" padding="lg" gap="lg">
        <View style={styles.sealRow}>
          <AppText>타임캡슐로 봉인하기</AppText>
          <Switch
            accessibilityLabel="타임캡슐로 봉인하기"
            value={sealOn}
            onValueChange={handleToggleSeal}
            trackColor={{ true: theme.colors.accent }}
          />
        </View>

        {sealOn && (
          <>
            <View style={styles.periodChips}>
              {PRESET_OPTIONS.map(({ preset, label }) => (
                <Chip
                  key={preset}
                  label={label}
                  accessibilityLabel={label}
                  selected={sealPeriod === preset}
                  selection="fill"
                  background="paper"
                  onPress={() => setSealPeriod(preset)}
                />
              ))}
              <Chip
                label="날짜 고르기"
                accessibilityLabel="날짜 고르기"
                selected={sealPeriod === "custom"}
                selection="fill"
                background="paper"
                onPress={() => setSealPeriod("custom")}
              />
            </View>

            {sealPeriod === "custom" && (
              <View style={styles.calendarCard}>
                <Calendar
                  minDate={tomorrow}
                  onDayPress={(day: { dateString: string }) =>
                    handlePickCustomDate(day.dateString)
                  }
                  markedDates={
                    customDate !== null
                      ? {
                          [customDate]: {
                            selected: true,
                            selectedColor: theme.colors.accent,
                          },
                        }
                      : undefined
                  }
                  theme={{
                    calendarBackground: theme.colors.card,
                    dayTextColor: theme.colors.ink,
                    monthTextColor: theme.colors.ink,
                    textDisabledColor: theme.colors.subtle,
                    arrowColor: theme.colors.accent,
                    todayTextColor: theme.colors.accent,
                    selectedDayBackgroundColor: theme.colors.accent,
                    selectedDayTextColor: theme.colors.card,
                  }}
                />
                {customDate !== null &&
                  isValidCustomOpenDate(customDate, today) && (
                    <AppText
                      variant="small"
                      color="accent"
                      center
                      style={styles.openDateText}
                    >
                      {openDateLabel(customDate)}
                    </AppText>
                  )}
              </View>
            )}
          </>
        )}
      </Card>

      {saveFailed && (
        <AppText variant="small" color="subtle" center>
          잠시 후 다시 한번 눌러 주세요
        </AppText>
      )}

      <Button
        label="간직하기"
        accessibilityLabel="간직하기"
        accessibilityState={{ disabled: !canSave }}
        disabled={!canSave}
        onPress={handleSave}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sealRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: theme.touchTarget,
  },
  periodChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  calendarCard: {
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    gap: theme.spacing.sm,
  },
  openDateText: {
    paddingBottom: theme.spacing.sm,
  },
});
