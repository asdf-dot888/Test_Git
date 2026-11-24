import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerSide } from "@board-game/game-core";
import { CombatEffectLayer } from "../components/CombatEffectLayer.js";
import { createAudioController, type AudioController } from "../game/audio.js";
import { combatEventSounds, spellCueFor, type CombatEffectEvent } from "../game/combatEffects.js";
import { REQUIRED_SPELL_VISUAL_IDS, getSpellVisualSpec } from "../game/spellEffectCatalog.js";
import { PREVIEW_GROUPS, PREVIEW_TARGETS, buildPreviewEvent, previewGroup, previewLabel, type TargetChoice } from "./previewEvents.js";
import "./effectsPreview.css";

/** Development-only gallery for reviewing spell and hero power effects (visual + sound) without a battle. */

export function EffectsPreview() {
  const [events, setEvents] = useState<CombatEffectEvent[]>([]);
  const [selected, setSelected] = useState<string>(REQUIRED_SPELL_VISUAL_IDS[0]!);
  const [caster, setCaster] = useState<PlayerSide>("player");
  const [target, setTarget] = useState<TargetChoice>("enemy-hero");
  const [damage, setDamage] = useState(0);
  const [slowMotion, setSlowMotion] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [playingAll, setPlayingAll] = useState(false);
  const nextEventId = useRef(1);
  const audio = useRef<AudioController | null>(null);
  const playAllToken = useRef(0);

  const ensureAudio = useCallback((): AudioController | null => {
    if (!audio.current && typeof Audio !== "undefined") {
      audio.current = createAudioController();
      void audio.current.unlock();
    }
    return audio.current;
  }, []);

  useEffect(() => {
    audio.current?.setSettings({ musicVolume: 0, effectsVolume: 0.72, muted: !soundOn });
  }, [soundOn]);

  useEffect(() => () => {
    playAllToken.current += 1;
    audio.current?.dispose();
    audio.current = null;
  }, []);

  const play = useCallback((id: string) => {
    const event = buildPreviewEvent({ id, eventId: nextEventId.current, caster, target, damage, slowMotion });
    nextEventId.current += 1;
    setEvents((current) => [...current, event]);
    const controller = ensureAudio();
    if (controller) {
      controller.setSettings({ musicVolume: 0, effectsVolume: 0.72, muted: !soundOn });
      for (const cue of combatEventSounds(event)) controller.playEffect(cue);
      const spellCue = spellCueFor(event);
      if (spellCue) controller.playSpellCue(spellCue);
    }
  }, [caster, damage, ensureAudio, slowMotion, soundOn, target]);

  const playHoverSound = useCallback(() => {
    const controller = ensureAudio();
    if (!controller) return;
    controller.setSettings({ musicVolume: 0, effectsVolume: 0.72, muted: !soundOn });
    controller.playEffect("ui-hover");
  }, [ensureAudio, soundOn]);

  const playTauntSound = useCallback((kind: "taunt-summon" | "taunt-blocked") => {
    const controller = ensureAudio();
    if (!controller) return;
    controller.setSettings({ musicVolume: 0, effectsVolume: 0.72, muted: !soundOn });
    controller.playEffect(kind);
  }, [ensureAudio, soundOn]);

  const playAll = useCallback(async () => {
    const token = playAllToken.current + 1;
    playAllToken.current = token;
    setPlayingAll(true);
    for (const id of REQUIRED_SPELL_VISUAL_IDS) {
      const spec = getSpellVisualSpec(id);
      if (!spec) continue;
      if (playAllToken.current !== token) return;
      setSelected(id);
      play(id);
      await new Promise<void>((resolve) => window.setTimeout(resolve, spec.totalMs * (slowMotion ? 2 : 1) + 350));
    }
    if (playAllToken.current === token) setPlayingAll(false);
  }, [play, slowMotion]);

  const stopAll = useCallback(() => {
    playAllToken.current += 1;
    setPlayingAll(false);
  }, []);

  const selectedSpec = getSpellVisualSpec(selected);

  return (
    <main className="effects-preview">
      <header className="effects-preview__header">
        <h1>주문·영웅 능력 연출 미리보기</h1>
        <p>개발 전용 페이지입니다. 효과를 선택하고 재생해 연출과 소리를 확인하세요.</p>
      </header>

      <section className="effects-preview__controls" aria-label="재생 설정">
        <label>시전자
          <select value={caster} onChange={(event) => setCaster(event.target.value as PlayerSide)}>
            <option value="player">플레이어</option>
            <option value="enemy">적</option>
          </select>
        </label>
        <label>대상
          <select value={target} onChange={(event) => setTarget(event.target.value as TargetChoice)}>
            {PREVIEW_TARGETS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>피해량(0이면 피격 없음)
          <input type="number" min={0} max={9} value={damage} onChange={(event) => setDamage(Math.max(0, Math.min(9, Number(event.target.value) || 0)))} />
        </label>
        <label className="effects-preview__check"><input type="checkbox" checked={slowMotion} onChange={(event) => setSlowMotion(event.target.checked)} />슬로 모션</label>
        <label className="effects-preview__check"><input type="checkbox" checked={soundOn} onChange={(event) => setSoundOn(event.target.checked)} />소리</label>
        <button type="button" className="effects-preview__play" onClick={() => play(selected)} disabled={!selectedSpec}>재생</button>
        <button type="button" onClick={playHoverSound}>호버 소리 (카드 사락)</button>
        <button type="button" onClick={() => playTauntSound("taunt-summon")}>도발 하수인 소리</button>
        <button type="button" onClick={() => playTauntSound("taunt-blocked")}>도발에 막힌 공격 소리</button>
        {playingAll
          ? <button type="button" onClick={stopAll}>전체 재생 중지</button>
          : <button type="button" onClick={() => void playAll()}>등록된 효과 전체 재생</button>}
      </section>

      <p className="effects-preview__info" role="status">
        {selectedSpec
          ? `${previewLabel(selected)}: ${selectedSpec.weight === "large" ? "대형" : "일반"}, 타격 ${selectedSpec.impactAtMs}ms, 전체 ${selectedSpec.totalMs}ms`
          : `${previewLabel(selected)}: 아직 연출이 등록되지 않았습니다`}
      </p>

      <div className="effects-preview__layout">
        <nav className="effects-preview__list" aria-label="효과 목록">
          {PREVIEW_GROUPS.map((group) => {
            const ids = REQUIRED_SPELL_VISUAL_IDS.filter((id) => previewGroup(id) === group);
            return (
              <section key={group}>
                <h2>{group} ({ids.length})</h2>
                <ul>
                  {ids.map((id) => {
                    const registered = getSpellVisualSpec(id) !== undefined;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className={`effects-preview__item${selected === id ? " is-selected" : ""}`}
                          aria-pressed={selected === id}
                          disabled={!registered}
                          onClick={() => setSelected(id)}
                        >
                          {previewLabel(id)}{registered ? "" : " (연출 없음)"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </nav>

        <section className="battle-board effects-preview__board" aria-label="가상 전투 보드">
          <div className="enemy-hand effects-preview__strip">적 손패</div>
          <div className="effects-preview__row">
            <div className="effects-preview__hero" data-effect-anchor="hero:enemy">적 영웅</div>
          </div>
          <div className="effects-preview__row">
            {[0, 1, 2].map((slot) => <div key={slot} className="effects-preview__minion" data-effect-anchor={`minion:enemy:${slot}`}>적 하수인 {slot + 1}</div>)}
          </div>
          <div className="effects-preview__row">
            {[0, 1, 2].map((slot) => <div key={slot} className="effects-preview__minion is-player" data-effect-anchor={`minion:player:${slot}`}>내 하수인 {slot + 1}</div>)}
          </div>
          <div className="effects-preview__row">
            <div className="effects-preview__hero is-player" data-effect-anchor="hero:player">내 영웅</div>
          </div>
          <div className="hand-panel effects-preview__strip">내 손패</div>
        </section>
      </div>

      <CombatEffectLayer events={events} onComplete={(eventId) => setEvents((current) => current.filter((event) => event.id !== eventId))} />
    </main>
  );
}
