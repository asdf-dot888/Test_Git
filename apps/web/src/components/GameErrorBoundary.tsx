import { Component, type ErrorInfo, type ReactNode } from "react";

interface GameErrorBoundaryProps { children: ReactNode; }
interface GameErrorBoundaryState { error: Error | null; }

export class GameErrorBoundary extends Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
  state: GameErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): GameErrorBoundaryState { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("The game screen could not be rendered.", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <main className="run-screen"><section className="run-card" role="alert"><span className="eyebrow">GAME ERROR</span><h1>화면을 표시하지 못했습니다</h1><p>현재 원정 상태는 유지되어 있습니다.</p><button className="menu-primary" type="button" onClick={() => this.setState({ error: null })}>다시 시도</button></section></main>;
    }
    return this.props.children;
  }
}
