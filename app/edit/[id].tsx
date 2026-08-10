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

import { useDb } from "@/db/provider";
import type { DiaryStyle } from "@/domain/types";
import { getCapsuleForDiary } from "@/repositories/capsuleRepository";
import { getDiary, updateDiary } from "@/repositories/diaryRepository";
import { saveLastStyle } from "@/repositories/settingsRepository";
import { NotebookPage } from "@/ui/NotebookPage";
import { StylePicker } from "@/ui/StylePicker";
import { theme } from "@/ui/theme";

/**
 * 수정 화면 (Requirement 8): 저장된 일기의 제목·본문·꾸미기를 고친다.
 * 작성일(created_at)과 질문 연결(question_id)은 건드리지 않는다 —
 * updateDiary가 두 값을 보존한다(레포지토리 테스트로 고정).
 *
 * - 빈 본문(공백·개행만)은 조용히 저장되지 않는다 — 버튼 비활성뿐,
 *   에러는 띄우지 않는다 (쓰기 화면과 동일 규칙).
 * - 제목을 지우면 null로 저장된다 (제목 없는 일기로 돌아간다).
 * - 저장 완료 시 last_style도 동일하게 갱신된다 (Req 8).
 * - 봉인 UI는 없다 — 봉인은 저장 시점에만 선택할 수 있다 (Req 3).
 * - 봉인 중인 일기는 내용을 볼 수 없으므로 수정할 수 없다: 열람 화면이
 *   수정 진입점을 숨기지만, 혹시 이 화면에 직접 들어와도 내용을 그리지
 *   않고 조용한 안내만 보여 준다 (deep-link 방어).
 */
export default function EditDiary() {
  const db = useDb();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : undefined;

  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "missing" }
    | { kind: "sealed" }
    | { kind: "ready" }
  >({ kind: "loading" });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [style, setStyle] = useState<DiaryStyle | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const found = id === undefined ? null : await getDiary(db, id);
      if (found === null) {
        if (!cancelled) setState({ kind: "missing" });
        return;
      }
      // 봉인 중(캡슐 존재 && 미개봉)이면 내용을 절대 채우지 않는다.
      const capsule = await getCapsuleForDiary(db, found.id);
      if (capsule !== null && capsule.openedAt === null) {
        if (!cancelled) setState({ kind: "sealed" });
        return;
      }
      if (!cancelled) {
        setTitle(found.title ?? "");
        setContent(found.content);
        setStyle(found.style);
        setState({ kind: "ready" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  if (state.kind === "loading") {
    return <View style={styles.screen} />;
  }

  if (state.kind === "missing" || state.kind === "sealed" || style === null) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.missingText}>
          {state.kind === "sealed"
            ? "봉인된 이야기는 열리는 날까지 고칠 수 없어요."
            : "이 이야기는 지금 찾을 수 없어요."}
        </Text>
      </View>
    );
  }

  const canSave = content.trim().length > 0 && !saving;
  const contentLineHeight = Math.round(style.fontSize * 1.6);

  const handleSave = async () => {
    if (!canSave || id === undefined) {
      return;
    }
    setSaving(true);
    setSaveFailed(false);
    try {
      const trimmedTitle = title.trim();
      await updateDiary(
        db,
        id,
        {
          title: trimmedTitle.length > 0 ? trimmedTitle : null,
          content,
          style,
        },
        new Date().toISOString(),
      );
      await saveLastStyle(db, style);
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
            accessibilityLabel="고쳐 간직하기"
            accessibilityState={{ disabled: !canSave }}
            disabled={!canSave}
            onPress={handleSave}
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          >
            <Text style={styles.saveButtonText}>고쳐 간직하기</Text>
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
  centered: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  missingText: {
    fontSize: theme.fontSize.body,
    color: theme.colors.subtle,
    textAlign: "center",
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
