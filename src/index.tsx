import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import mixpanel from "mixpanel-browser";
import ReactDOM from "react-dom";

mixpanel.init("063e9838740260bebb040a86ddca9f83");

// @ts-ignore
import logoSrc from "./assets/logo.png";
import Instructions from "./views/Instructions";
import { formatTime, mobileCheck } from "./helpers";
import { WorkoutRoom } from "./WorkoutStore";
import { PoseCamera } from "./PoseCamera";
import { WorkoutState } from "./types";
import * as S from "./views/styled";

const jwt = new URLSearchParams(window.location.search).get("w") ?? "";
const store = new WorkoutRoom();

const ExerciseHint = ({ frames, per }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % frames.length), per);
    return () => clearInterval(timer);
  }, []);

  return (
    <S.ExerciseHint>
      <img src={frames[frame]} />
    </S.ExerciseHint>
  );
};

const App = observer(() => {
  const [isVideo, setVideo] = useState(false);
  const [isInstructions, setInstructions] = useState(false);
  const [isLoaded, setLoaded] = useState(false);
  const [fps, setFps] = useState(0);

  const ex = store.currentExerciseDetails;
  const hideCamera = !ex || !isLoaded;
  const handleLoaded = () => {
    void store?.initialize(jwt);
    setLoaded(true);
  };

  if (mobileCheck()) {
    return (
      <S.MobileAccess>
        <img src={logoSrc} />
        <h1>Fora.Vision</h1>
        <br />
        <p>Откройте нас через компьютер, чтобы начать тренировку!</p>
      </S.MobileAccess>
    );
  }

  return (
    <div>
      <PoseCamera
        isSavePhotos={store.isSavePhotos}
        style={{ opacity: hideCamera ? 0 : 1 }}
        highlightSkelet={store.highlightSkelet}
        onFrame={store.processFrame}
        onLoaded={handleLoaded}
        onPhoto={store.onPhoto}
        onFps={setFps}
      />

      {!isVideo && !hideCamera && (
        <S.Page>
          <S.Screen>
            <S.TopAngle>
              <S.ExerciseTitle>{ex?.name}</S.ExerciseTitle>
              <div style={{ display: "flex" }}>
                <S.Badge style={{ marginRight: 8 }}>{fps} FPS</S.Badge>
                {store.isSavePhotos && <S.BadgeRec>REC</S.BadgeRec>}
              </div>
            </S.TopAngle>

            <S.Badges>
              <S.ExerciseCount>{store.actionsLeftForCurrentExercise}</S.ExerciseCount>
            </S.Badges>

            <S.HelpSide>
              {store.state === WorkoutState.Hint && <ExerciseHint per={2000} frames={[ex?.image_down.replace(".png", ".svg"), ex?.image_up.replace(".png", ".svg")]} />}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {store.showReplaceButton && (
                  <S.HintButton onClick={() => store.replaceExercise()} style={{ marginRight: 16 }}>
                    Заменить упражнение
                  </S.HintButton>
                )}

                <S.HintButton onClick={() => setInstructions(true)} style={{ marginRight: 16 }}>
                  Плохо распознает?
                </S.HintButton>
                <S.HintButton onClick={() => setVideo(true)}>Показать упражнение</S.HintButton>
              </div>
            </S.HelpSide>
          </S.Screen>

          <S.Timeline>
            <S.TimelineProgress style={{ width: `${store.progress * 100}%` }} />
            <S.TimelineTotal>{formatTime(store.totalTime)}</S.TimelineTotal>
          </S.Timeline>

          <div style={{ display: "flex", justifyContent: "space-between " }}>
            <S.TextTOS>
              Занимаясь тренировками на этом сайте, вы соглашаетесь с <a href="https://fora.vision/tos">условиями пользования</a>
            </S.TextTOS>
            <S.TextTOS style={{ fontWeight: "bold" }}>
              <a href="https://fora.vision">Fora.Vision @2022</a>
            </S.TextTOS>
          </div>
        </S.Page>
      )}

      {store.state === WorkoutState.Complete && (
        <S.Overlay style={{ flexDirection: "column" }}>
          <h1 style={{ color: "#fff" }}>Тренировка завершена!</h1>
          <p style={{ color: "#fff" }}>Можете закрыть страницу, ваш результат сохранен</p>
        </S.Overlay>
      )}

      {store.state === WorkoutState.Error && (
        <S.Overlay style={{ flexDirection: "column" }}>
          <h1 style={{ color: "#fff" }}>{store.error.title}</h1>
          <p style={{ color: "#fff" }}>{store.error.description}</p>
        </S.Overlay>
      )}

      {(!isLoaded || store.state === WorkoutState.Loading) && (
        <S.Overlay>
          <h1 style={{ color: "#fff" }}>Загрузка...</h1>
        </S.Overlay>
      )}

      {store.state === WorkoutState.Invite && (
        <S.MobileAccess style={{ background: "#000" }}>
          <img src={logoSrc} />
          <h1>Fora.Vision</h1>
          <br />
          <p>Откройте нас в Telegram боте, чтобы выбрать тренировку!</p>
        </S.MobileAccess>
      )}

      {isInstructions && (
        <S.Overlay onClick={() => setVideo(false)} style={{ background: "#000000" }}>
          <Instructions />
          <S.HintButton style={{ position: "absolute", top: 64, bottom: "auto", right: 64 }} onClick={() => setInstructions(false)}>
            Закрыть
          </S.HintButton>
        </S.Overlay>
      )}

      {isVideo && (
        <S.Overlay onClick={() => setVideo(false)}>
          <video controls onClick={(e) => e.stopPropagation()} style={{ borderRadius: 16, background: "rgba(0, 0, 0, .2)", width: "70%" }} src={ex?.video_url} />
          <S.HintButton style={{ position: "absolute", top: 64, bottom: "auto", right: 64 }} onClick={() => setVideo(false)}>
            Закрыть
          </S.HintButton>
        </S.Overlay>
      )}
    </div>
  );
});

ReactDOM.render(<App />, document.getElementById("root"));
