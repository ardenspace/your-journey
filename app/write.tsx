import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { QUESTION_BANK } from "@/content/questions";
import { newId, useDb } from "@/db/provider";
import { currentQuestion, markAnswered } from "@/domain/questionEngine";
import type { DiaryStyle } from "@/domain/types";
import { createDiary } from "@/repositories/diaryRepository";
import {
  getLastStyle,
  getQuestionState,
  saveLastStyle,
  saveQuestionState,
} from "@/repositories/settingsRepository";
import { NotebookPage } from "@/ui/NotebookPage";
import { StylePicker } from "@/ui/StylePicker";
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
 */
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
    return <View style={styles.screen} />;
  }

  const canSave = content.trim().length > 0 && !saving;
  const contentLineHeight = Math.round(style.fontSize * 1.6);

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    setSaveFailed(false);
    try {
      const trimmedTitle = title.trim();
      await createDiary(
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
      router.back();
    } catch {
      // 저장 실패는 부드럽게 안내만 — 기술 용어·에러 코드 없음.
      setSaving(false);
      setSaveFailed(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {questionText !== undefined && (
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{questionText}</Text>
            </View>
          )}

          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="제목을 붙여 주셔도 좋아요"
            placeholderTextColor={theme.colors.subtle}
            maxLength={100}
          />

          <NotebookPage
            design={style.notebookDesign}
            backgroundColor={style.backgroundColor}
            lineSpacing={contentLineHeight}
            style={styles.contentPage}
          >
            <TextInput
              style={[
                styles.contentInput,
                {
                  fontSize: style.fontSize,
                  lineHeight: contentLineHeight,
                  color: style.fontColor,
                },
              ]}
              value={content}
              onChangeText={setContent}
              placeholder="마음 가는 대로 적어 보세요"
              placeholderTextColor={theme.colors.subtle}
              multiline
              textAlignVertical="top"
            />
          </NotebookPage>

          <StylePicker style={style} onChange={setStyle} />

          {saveFailed && (
            <Text style={styles.saveFailedText}>
              잠시 후 다시 한번 눌러 주세요
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="간직하기"
            accessibilityState={{ disabled: !canSave }}
            disabled={!canSave}
            onPress={handleSave}
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          >
            <Text style={styles.saveButtonText}>간직하기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.paper,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  content: {
    width: "100%",
    maxWidth: theme.maxContentWidth,
    alignSelf: "center",
    gap: 20,
  },
  questionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
  },
  questionText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.ink,
    lineHeight: 30,
  },
  titleInput: {
    minHeight: theme.touchTarget,
    fontSize: theme.fontSize.body,
    color: theme.colors.ink,
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contentPage: {
    borderRadius: 12,
  },
  contentInput: {
    minHeight: 240,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "transparent",
  },
  saveFailedText: {
    fontSize: theme.fontSize.small,
    color: theme.colors.subtle,
    textAlign: "center",
  },
  saveButton: {
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    fontSize: theme.fontSize.title,
    color: theme.colors.card,
    fontWeight: "600",
  },
});
