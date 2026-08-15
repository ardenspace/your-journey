import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { useDb } from "@/db/provider";
import type { DiaryStyle } from "@/domain/types";
import { getCapsuleForDiary } from "@/repositories/capsuleRepository";
import { getDiary, updateDiary } from "@/repositories/diaryRepository";
import { saveLastStyle } from "@/repositories/settingsRepository";
import { DiaryEditor } from "@/ui/DiaryEditor";
import { AppText, Button, Screen } from "@/ui/primitives";

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
    return <Screen />;
  }

  if (state.kind === "missing" || state.kind === "sealed" || style === null) {
    return (
      <Screen centered padding="xxl">
        <AppText color="subtle" center>
          {state.kind === "sealed"
            ? "봉인된 이야기는 열리는 날까지 고칠 수 없어요."
            : "이 이야기는 지금 찾을 수 없어요."}
        </AppText>
      </Screen>
    );
  }

  const canSave = content.trim().length > 0 && !saving;

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
    <Screen scroll keyboardAvoiding gap="xl">
      <DiaryEditor
        title={title}
        onTitleChange={setTitle}
        content={content}
        onContentChange={setContent}
        style={style}
        onStyleChange={setStyle}
      />

      {saveFailed && (
        <AppText variant="small" color="subtle" center>
          잠시 후 다시 한번 눌러 주세요
        </AppText>
      )}

      <Button
        label="고쳐 간직하기"
        accessibilityLabel="고쳐 간직하기"
        accessibilityState={{ disabled: !canSave }}
        disabled={!canSave}
        onPress={handleSave}
      />
    </Screen>
  );
}
