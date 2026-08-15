import { StyleSheet, TextInput } from "react-native";

import type { DiaryStyle } from "../domain/types";
import { NotebookPage } from "./NotebookPage";
import { StylePicker } from "./StylePicker";
import { theme } from "./theme";

interface DiaryEditorProps {
  title: string;
  onTitleChange: (title: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  style: DiaryStyle;
  onStyleChange: (style: DiaryStyle) => void;
}

/**
 * 쓰기·수정 화면이 공유하는 일기 입력부: 제목 입력 + 속지(NotebookPage)
 * 위의 본문 입력 + 꾸미기(StylePicker). 종이 위에 쓰는 감각의 시각
 * 처리가 여기 한 곳에만 있다 — 두 화면은 이 아래에 각자의 저장 UI만 얹는다.
 * 본문 글자 크기·색은 사용자가 고른 DiaryStyle을 그대로 따른다 (테마가
 * 아니라 일기의 속성이라 AppText를 쓰지 않는다).
 */
export function DiaryEditor({
  title,
  onTitleChange,
  content,
  onContentChange,
  style,
  onStyleChange,
}: DiaryEditorProps) {
  const contentLineHeight = Math.round(style.fontSize * 1.6);

  return (
    <>
      <TextInput
        style={styles.titleInput}
        value={title}
        onChangeText={onTitleChange}
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
          onChangeText={onContentChange}
          placeholder="마음 가는 대로 적어 보세요"
          placeholderTextColor={theme.colors.subtle}
          multiline
          textAlignVertical="top"
        />
      </NotebookPage>

      <StylePicker style={style} onChange={onStyleChange} />
    </>
  );
}

const styles = StyleSheet.create({
  titleInput: {
    minHeight: theme.touchTarget,
    fontSize: theme.fontSize.body,
    color: theme.colors.ink,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  contentPage: {
    borderRadius: theme.radius.sm,
  },
  contentInput: {
    minHeight: 240,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    backgroundColor: "transparent",
  },
});
