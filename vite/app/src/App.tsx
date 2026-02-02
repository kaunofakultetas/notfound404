import { useState, useEffect, useRef, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Typography } from '@mui/material'
import useInterval from './hooks/useInterval'

type Apple = {
  x: number
  y: number
}

type Velocity = {
  dx: number
  dy: number
}

export default function App() {
  // Canvas Settings
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasWidth = 500
  const canvasHeight = 380
  const canvasGridSize = 20

  // Game Settings
  const minGameSpeed = 7
  const maxGameSpeed = 7

  // Game State
  const [gameDelay, setGameDelay] = useState<number>(1000 / minGameSpeed)
  const [countDown, setCountDown] = useState<number>(4)
  const [running, setRunning] = useState(false)
  const [isLost, setIsLost] = useState(false)
  const [highscore, setHighscore] = useState(0)
  const [newHighscore, setNewHighscore] = useState(false)
  const [score, setScore] = useState(0)
  const [snake, setSnake] = useState<{
    head: { x: number; y: number }
    trail: Array<{ x: number; y: number }>
  }>({
    head: { x: 12, y: 9 },
    trail: [],
  })
  const [apple, setApple] = useState<Apple>({ x: -1, y: -1 })
  const [velocity, setVelocity] = useState<Velocity>({ dx: 0, dy: 0 })
  const [previousVelocity, setPreviousVelocity] = useState<Velocity>({
    dx: 0,
    dy: 0,
  })

  const clearCanvas = (ctx: CanvasRenderingContext2D) =>
    ctx.clearRect(-1, -1, canvasWidth + 2, canvasHeight + 2)

  const generateApplePosition = useCallback((): Apple => {
    const x = Math.floor(Math.random() * (canvasWidth / canvasGridSize))
    const y = Math.floor(Math.random() * (canvasHeight / canvasGridSize))
    // Check if random position interferes with snake head or trail
    if (
      (snake.head.x === x && snake.head.y === y) ||
      snake.trail.some((snakePart) => snakePart.x === x && snakePart.y === y)
    ) {
      return generateApplePosition()
    }
    return { x, y }
  }, [snake.head.x, snake.head.y, snake.trail])

  // Initialise state and start countdown
  const startGame = () => {
    setGameDelay(1000 / minGameSpeed)
    setIsLost(false)
    setScore(0)
    setSnake({
      head: { x: 12, y: 9 },
      trail: [],
    })
    setApple(generateApplePosition())
    setVelocity({ dx: 0, dy: -1 })
    setRunning(true)
    setNewHighscore(false)
    setCountDown(3)
  }

  // Reset state and check for highscore
  const gameOver = useCallback(() => {
    if (score > highscore) {
      setHighscore(score)
      localStorage.setItem('highscore', score.toString())
      setNewHighscore(true)
    }
    setIsLost(true)
    setRunning(false)
    setVelocity({ dx: 0, dy: 0 })
    setCountDown(4)
  }, [score, highscore])

  const fillRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    ctx.fillRect(x, y, w, h)
  }

  const strokeRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    ctx.strokeRect(x + 0.5, y + 0.5, w, h)
  }

  const drawSnake = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#78003F'
    ctx.strokeStyle = '#003779'

    fillRect(
      ctx,
      snake.head.x * canvasGridSize,
      snake.head.y * canvasGridSize,
      canvasGridSize,
      canvasGridSize
    )

    strokeRect(
      ctx,
      snake.head.x * canvasGridSize,
      snake.head.y * canvasGridSize,
      canvasGridSize,
      canvasGridSize
    )

    snake.trail.forEach((snakePart) => {
      fillRect(
        ctx,
        snakePart.x * canvasGridSize,
        snakePart.y * canvasGridSize,
        canvasGridSize,
        canvasGridSize
      )

      strokeRect(
        ctx,
        snakePart.x * canvasGridSize,
        snakePart.y * canvasGridSize,
        canvasGridSize,
        canvasGridSize
      )
    })
  }, [snake.head.x, snake.head.y, snake.trail])

  const drawApple = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#E64164'
    ctx.strokeStyle = '#881A1B'

    if (
      apple &&
      typeof apple.x !== 'undefined' &&
      typeof apple.y !== 'undefined'
    ) {
      fillRect(
        ctx,
        apple.x * canvasGridSize,
        apple.y * canvasGridSize,
        canvasGridSize,
        canvasGridSize
      )

      strokeRect(
        ctx,
        apple.x * canvasGridSize,
        apple.y * canvasGridSize,
        canvasGridSize,
        canvasGridSize
      )
    }
  }, [apple])

  // Update snake.head, snake.trail and apple positions. Check for collisions.
  const updateSnake = useCallback(() => {
    // Check for collision with walls
    const nextHeadPosition = {
      x: snake.head.x + velocity.dx,
      y: snake.head.y + velocity.dy,
    }
    if (
      nextHeadPosition.x < 0 ||
      nextHeadPosition.y < 0 ||
      nextHeadPosition.x >= canvasWidth / canvasGridSize ||
      nextHeadPosition.y >= canvasHeight / canvasGridSize
    ) {
      gameOver()
      return
    }

    // Check for collision with apple
    if (nextHeadPosition.x === apple.x && nextHeadPosition.y === apple.y) {
      setScore((prevScore) => prevScore + 1)
      setApple(generateApplePosition())
    }

    const updatedSnakeTrail = [...snake.trail, { ...snake.head }]
    // Remove trail history beyond snake trail length (score + 2)
    while (updatedSnakeTrail.length > score + 2) updatedSnakeTrail.shift()
    // Check for snake colliding with itself
    if (
      updatedSnakeTrail.some(
        (snakePart) =>
          snakePart.x === nextHeadPosition.x &&
          snakePart.y === nextHeadPosition.y
      )
    ) {
      gameOver()
      return
    }

    // Update state
    setPreviousVelocity({ ...velocity })
    setSnake({
      head: { ...nextHeadPosition },
      trail: [...updatedSnakeTrail],
    })
  }, [snake, velocity, apple, score, gameOver, generateApplePosition])

  // Game Hook
  useEffect(() => {
    const canvas = canvasRef?.current
    const ctx = canvas?.getContext('2d')

    if (ctx && !isLost) {
      clearCanvas(ctx)
      drawApple(ctx)
      drawSnake(ctx)
    }
  }, [snake, isLost, drawApple, drawSnake])

  // Game Update Interval
  useInterval(
    () => {
      if (!isLost) {
        updateSnake()
      }
    },
    running && countDown === 0 ? gameDelay : null
  )

  // Countdown Interval
  useInterval(
    () => {
      setCountDown((prevCountDown) => prevCountDown - 1)
    },
    countDown > 0 && countDown < 4 ? 800 : null
  )

  // DidMount Hook for Highscore
  useEffect(() => {
    setHighscore(
      localStorage.getItem('highscore')
        ? parseInt(localStorage.getItem('highscore')!)
        : 0
    )
  }, [])

  // Score Hook: increase game speed starting at 16
  useEffect(() => {
    if (score > minGameSpeed && score <= maxGameSpeed) {
      setGameDelay(1000 / score)
    }
  }, [score])

  // Event Listener: Key Presses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'w',
          'a',
          's',
          'd',
        ].includes(e.key)
      ) {
        let newVelocity = { dx: 0, dy: 0 }

        switch (e.key) {
          case 'ArrowRight':
            newVelocity = { dx: 1, dy: 0 }
            break
          case 'ArrowLeft':
            newVelocity = { dx: -1, dy: 0 }
            break
          case 'ArrowDown':
            newVelocity = { dx: 0, dy: 1 }
            break
          case 'ArrowUp':
            newVelocity = { dx: 0, dy: -1 }
            break
          case 'd':
            newVelocity = { dx: 1, dy: 0 }
            break
          case 'a':
            newVelocity = { dx: -1, dy: 0 }
            break
          case 's':
            newVelocity = { dx: 0, dy: 1 }
            break
          case 'w':
            newVelocity = { dx: 0, dy: -1 }
            break
          default:
            console.error('Error with handleKeyDown')
        }
        if (
          !(
            previousVelocity.dx + newVelocity.dx === 0 &&
            previousVelocity.dy + newVelocity.dy === 0
          )
        ) {
          setVelocity(newVelocity)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [previousVelocity])

  return (
    <>
      {/* Navigation Bar */}
      <div style={{
        height: 75,
        backgroundColor: '#78003F',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 20,
        color: 'white',
        fontWeight: 'bold'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'flex-start' }}>
          <a href="https://knf.vu.lt" style={{ marginRight: 20, padding: 10 }}>
            <img src="/img/logo_knf.png" alt="VU Kauno fakultetas" style={{ height: 75, cursor: 'pointer' }} />
          </a>
        </div>
      </div>

      {/* Page Content */}
      <div style={{ minHeight: 'calc(100vh - 125px)' }}>

        {/* Title */}
        <div
          style={{
            width: '100%',
            margin: '50px 0 30px 0',
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Typography sx={{ color: "#78003F", fontSize: 30, fontWeight: 'bold', textAlign: 'center' }}>
            Panašu kad paklydote, ta proga<br /> pažaiskite gyvatėlę:
          </Typography>
        </div>

        <div
          style={{
            width: '100%',
            margin: 0,
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <main>
            <canvas
              ref={canvasRef}
              width={canvasWidth + 1}
              height={canvasHeight + 1}
            />
            <section>
              <div className="score">
                <p>
                  <FontAwesomeIcon icon={['fas', 'star']} color={"#78003F"} />
                  Taškai: {score}
                </p>
                <p>
                  <FontAwesomeIcon icon={['fas', 'trophy']} color={"#78003F"} />
                  Rekordas: {highscore > score ? highscore : score}
                </p>
              </div>
              {!isLost && countDown > 0 ? (
                <button onClick={startGame}>
                  {countDown === 4 ? 'Žaisti' : countDown}
                </button>
              ) : (
                <div className="controls">
                  <p>Kaip žaisti?</p>
                  <p>
                    <FontAwesomeIcon icon={['fas', 'arrow-up']} />
                    <FontAwesomeIcon icon={['fas', 'arrow-right']} />
                    <FontAwesomeIcon icon={['fas', 'arrow-down']} />
                    <FontAwesomeIcon icon={['fas', 'arrow-left']} />
                  </p>
                </div>
              )}
            </section>
            {isLost && (
              <div className="game-overlay">
                <p className="large">Pralaimėjote</p>
                <p className="final-score">
                  {newHighscore ? `🎉 Naujas Rekordas 🎉` : `Surinkote: ${score}`}
                </p>
                {!running && isLost && (
                  <button onClick={startGame}>
                    {countDown === 4 ? 'Iš Naujo' : countDown}
                  </button>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        height: 50,
        backgroundColor: '#78003F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
      }}>
        © {new Date().getFullYear()} Vilniaus universitetas Kauno Fakultetas
      </div>
    </>
  )
}
