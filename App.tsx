import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const BALL_SIZE = 12;
const BRICK_ROWS = 5;
const BRICK_COLS = 6;
const BRICK_WIDTH = (SCREEN_WIDTH - 40) / BRICK_COLS;
const BRICK_HEIGHT = 25;
const BRICK_PADDING = 5;

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  alive: boolean;
}

interface GameState {
  paddleX: number;
  ballX: number;
  ballY: number;
  ballVX: number;
  ballVY: number;
  score: number;
  lives: number;
  bricks: Brick[];
  gameOver: boolean;
  gameWon: boolean;
}

const COLORS = ['#FF6B6B', '#FFA94D', '#FFE066', '#69DB7C', '#74C0FC'];

function initBricks(): Brick[] {
  const bricks: Brick[] = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks.push({
        x: 20 + col * (BRICK_WIDTH + BRICK_PADDING),
        y: 100 + row * (BRICK_HEIGHT + BRICK_PADDING),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        color: COLORS[row % COLORS.length],
        alive: true,
      });
    }
  }
  return bricks;
}

function initGameState(): GameState {
  return {
    paddleX: SCREEN_WIDTH / 2 - PADDLE_WIDTH / 2,
    ballX: SCREEN_WIDTH / 2,
    ballY: SCREEN_HEIGHT - 150,
    ballVX: 4 * (Math.random() > 0.5 ? 1 : -1),
    ballVY: -4,
    score: 0,
    lives: 3,
    bricks: initBricks(),
    gameOver: false,
    gameWon: false,
  };
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>(initGameState);
  const [isPlaying, setIsPlaying] = useState(false);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback(() => {
    setGameState(initGameState());
    setIsPlaying(true);
  }, []);

  const pauseGame = useCallback(() => {
    setIsPlaying(false);
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, []);

  const handleMove = useCallback((direction: 'left' | 'right') => {
    if (!isPlaying) return;
    setGameState(prev => {
      let newPaddleX = prev.paddleX;
      if (direction === 'left') {
        newPaddleX = Math.max(0, prev.paddleX - 25);
      } else {
        newPaddleX = Math.min(SCREEN_WIDTH - PADDLE_WIDTH, prev.paddleX + 25);
      }
      return { ...prev, paddleX: newPaddleX };
    });
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;

    gameLoopRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.gameOver || prev.gameWon) return prev;

        let { ballX, ballY, ballVX, ballVY, paddleX, score, lives, bricks, gameOver, gameWon } = prev;

        ballX += ballVX;
        ballY += ballVY;

        // Wall collisions
        if (ballX <= BALL_SIZE / 2) {
          ballX = BALL_SIZE / 2;
          ballVX = -ballVX;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (ballX >= SCREEN_WIDTH - BALL_SIZE / 2) {
          ballX = SCREEN_WIDTH - BALL_SIZE / 2;
          ballVX = -ballVX;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (ballY <= BALL_SIZE / 2) {
          ballY = BALL_SIZE / 2;
          ballVY = -ballVY;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        // Bottom - lose life
        if (ballY >= SCREEN_HEIGHT - BALL_SIZE / 2) {
          lives -= 1;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          if (lives <= 0) {
            gameOver = true;
            setIsPlaying(false);
          } else {
            return {
              ...prev,
              ballX: SCREEN_WIDTH / 2,
              ballY: SCREEN_HEIGHT - 150,
              ballVX: 4 * (Math.random() > 0.5 ? 1 : -1),
              ballVY: -4,
              lives,
            };
          }
        }

        // Paddle collision
        const paddleTop = SCREEN_HEIGHT - 60;
        if (
          ballY + BALL_SIZE / 2 >= paddleTop &&
          ballY - BALL_SIZE / 2 <= paddleTop + PADDLE_HEIGHT &&
          ballX >= paddleX &&
          ballX <= paddleX + PADDLE_WIDTH &&
          ballVY > 0
        ) {
          ballVY = -Math.abs(ballVY);
          const hitPos = (ballX - paddleX) / PADDLE_WIDTH;
          ballVX = (hitPos - 0.5) * 10;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        // Brick collisions
        bricks = bricks.map(brick => {
          if (!brick.alive) return brick;
          const brickLeft = brick.x;
          const brickRight = brick.x + brick.width;
          const brickTop = brick.y;
          const brickBottom = brick.y + brick.height;

          if (
            ballX + BALL_SIZE / 2 >= brickLeft &&
            ballX - BALL_SIZE / 2 <= brickRight &&
            ballY + BALL_SIZE / 2 >= brickTop &&
            ballY - BALL_SIZE / 2 <= brickBottom
          ) {
            ballVY = -ballVY;
            score += 10;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            return { ...brick, alive: false };
          }
          return brick;
        });

        // Win check
        if (bricks.every(b => !b.alive)) {
          gameWon = true;
          setIsPlaying(false);
        }

        return { ...prev, ballX, ballY, ballVX, ballVY, score, lives, bricks, gameOver, gameWon };
      });
    }, 16);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [isPlaying]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.scoreText}>Score: {gameState.score}</Text>
        <Text style={styles.livesText}>❤️ {gameState.lives}</Text>
      </View>

      {!isPlaying && !gameState.gameOver && !gameState.gameWon && (
        <View style={styles.overlay}>
          <Text style={styles.title}>🧱 BRICK BREAKER</Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.buttonText}>START GAME</Text>
          </TouchableOpacity>
        </View>
      )}

      {gameState.gameOver && (
        <View style={styles.overlay}>
          <Text style={styles.gameOverText}>💀 GAME OVER</Text>
          <Text style={styles.finalScore}>Score: {gameState.score}</Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.buttonText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      )}

      {gameState.gameWon && (
        <View style={styles.overlay}>
          <Text style={styles.winText}>🏆 YOU WIN!</Text>
          <Text style={styles.finalScore}>Score: {gameState.score}</Text>
          <TouchableOpacity style={styles.startButton} onPress={startGame}>
            <Text style={styles.buttonText}>PLAY AGAIN</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.gameArea}>
        {gameState.bricks.filter(b => b.alive).map((brick, i) => (
          <View
            key={i}
            style={[
              styles.brick,
              {
                left: brick.x,
                top: brick.y,
                width: brick.width,
                height: brick.height,
                backgroundColor: brick.color,
              },
            ]}
          />
        ))}

        <View
          style={[
            styles.paddle,
            { left: gameState.paddleX, top: SCREEN_HEIGHT - 60 },
          ]}
        />

        <View
          style={[
            styles.ball,
            {
              left: gameState.ballX - BALL_SIZE / 2,
              top: gameState.ballY - BALL_SIZE / 2,
            },
          ]}
        />
      </View>

      {isPlaying && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPressIn={() => handleMove('left')}
            onPressOut={() => handleMove('left')}
          >
            <Text style={styles.controlText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pauseButton} onPress={pauseGame}>
            <Text style={styles.controlText}>❚❚</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPressIn={() => handleMove('right')}
            onPressOut={() => handleMove('right')}
          >
            <Text style={styles.controlText}>▶</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  scoreText: {
    color: '#FFE066',
    fontSize: 22,
    fontWeight: 'bold',
  },
  livesText: {
    color: '#FF6B6B',
    fontSize: 22,
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 10,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFE066',
    marginBottom: 50,
    textShadowColor: '#FF6B6B',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 15,
  },
  startButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 50,
    paddingVertical: 18,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  gameOverText: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 20,
  },
  winText: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#69DB7C',
    marginBottom: 20,
  },
  finalScore: {
    fontSize: 26,
    color: '#fff',
    marginBottom: 40,
  },
  gameArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  brick: {
    position: 'absolute',
    borderRadius: 6,
    elevation: 3,
  },
  paddle: {
    position: 'absolute',
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    backgroundColor: '#74C0FC',
    borderRadius: 8,
    elevation: 5,
  },
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    backgroundColor: '#ffffff',
    borderRadius: BALL_SIZE / 2,
    elevation: 5,
  },
  controls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pauseButton: {
    backgroundColor: 'rgba(255,165,0,0.7)',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
});
