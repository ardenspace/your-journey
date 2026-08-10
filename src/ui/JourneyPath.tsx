import { StyleSheet, Text, View } from "react-native";

import { journeyProgress, MILESTONES } from "../domain/journeyProgress";
import { theme } from "./theme";

/**
 * 여정 경로 (Requirement 4): 기록이 쌓일수록 이어지는 경로 메타포.
 * 마일스톤마다 점 하나 — 도달한 점은 accent, 다음 구간은 진행도만큼 채워진다.
 * 숫자·통계·잔소리 텍스트는 일절 노출하지 않는다 (테스트로 강제).
 */
export function JourneyPath({ count }: { count: number }) {
  const progress = journeyProgress(count);

  /** 출발점 → 첫 마일스톤 구간의 채움 정도. */
  const startFill = progress.reached >= 1 ? 1 : progress.fraction;

  /** 점 i → 점 i+1 구간의 채움 정도. */
  const segmentFill = (i: number): number => {
    if (i < progress.reached - 1) return 1;
    if (i === progress.reached - 1) return progress.fraction;
    return 0;
  };

  return (
    <View style={styles.container} accessibilityLabel="당신의 여정">
      <View style={styles.path}>
        <Segment fill={startFill} />
        {MILESTONES.map((milestone, i) => (
          <View style={styles.step} key={milestone}>
            <View
              testID={`journey-dot-${i}`}
              style={[styles.dot, i < progress.reached && styles.dotReached]}
            />
            {i < MILESTONES.length - 1 && <Segment fill={segmentFill(i)} />}
          </View>
        ))}
      </View>
      <Text style={styles.caption}>
        {count > 0
          ? "여기까지 걸어오셨어요"
          : "오늘, 첫 걸음을 시작해 보세요"}
      </Text>
    </View>
  );
}

/** 점과 점 사이 경로 조각 — 옅은 트랙 위에 진행도만큼 accent 채움. */
function Segment({ fill }: { fill: number }) {
  const percent = Math.round(Math.min(Math.max(fill, 0), 1) * 100);
  return (
    <View style={styles.segment}>
      <View style={[styles.segmentFill, { width: `${percent}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 16,
  },
  path: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    flexShrink: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.subtle,
  },
  dotReached: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  segment: {
    flexGrow: 1,
    flexShrink: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.notebookLine,
    overflow: "hidden",
  },
  segmentFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: theme.colors.accent,
  },
  caption: {
    fontSize: theme.fontSize.small,
    color: theme.colors.subtle,
    textAlign: "center",
  },
});
