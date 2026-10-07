/**
 * First-join class test. Shown once, after the avatar, when no path is equipped.
 */
import { useMemo, useState } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import { equipRoute } from '../../lib/classLoadout'
import {
  buildAptitudeQuestions,
  scoreAptitude,
  saveAptitudeRecord,
} from '../../lib/classAptitude'

export default function ClassAptitude() {
  const { playerData, currentUser } = useAppState()
  const dispatch = useAppDispatch()
  const questions = useMemo(() => buildAptitudeQuestions(playerData), [playerData])
  const [index, setIndex] = useState(0)
  const [picks, setPicks] = useState([])
  const [result, setResult] = useState(null)
  const [equipError, setEquipError] = useState('')

  function enterApp(openSkills) {
    dispatch({ type: 'LAUNCH_APP', payload: { user: currentUser || {}, playerData } })
    if (openSkills) {
      dispatch({ type: 'SET_TAB', payload: 'profile', section: 'skills' })
    }
  }

  function skip() {
    saveAptitudeRecord({ status: 'skipped' })
    enterApp(false)
  }

  function choose(choiceIndex) {
    const next = [...picks, choiceIndex]
    setPicks(next)
    if (next.length < questions.length) {
      setIndex(next.length)
      return
    }
    const scored = scoreAptitude(questions, next)
    if (!scored) {
      saveAptitudeRecord({ status: 'skipped' })
      enterApp(false)
      return
    }
    const equipped = equipRoute(scored.number, scored.routeId, { playerData })
    saveAptitudeRecord({
      status: 'done',
      number: scored.number,
      routeId: scored.routeId,
    })
    if (!equipped.ok) setEquipError(equipped.error || 'Could not equip that path.')
    setResult(scored)
  }

  if (!questions.length) {
    return (
      <div className="ob-overlay">
        <div className="ob-content">
          <div className="ob-card-wrapper">
            <div className="ob-screen">
              <h2 className="ob-title">CLASS</h2>
              <p className="ob-body">Your chart has no seal to train yet. You can equip a path later from Skills.</p>
              <button type="button" className="ob-cta" onClick={skip}>ENTER</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="ob-overlay">
        <div className="ob-content">
          <div className="ob-card-wrapper">
            <div className="ob-screen apt-screen">
              <p className="apt-kicker">YOUR CLASS</p>
              <h2 className="ob-title">{result.classNoun}</h2>
              <p className="apt-path">{result.sealLabel} · {result.routeName}</p>
              <p className="ob-body">{result.reason}</p>
              {result.runnerUp && (
                <p className="apt-alt">
                  Also fits: {result.runnerUp.sealLabel} · {result.runnerUp.routeName}.
                </p>
              )}
              {equipError && <p className="apt-error" role="alert">{equipError}</p>}
              <button type="button" className="ob-cta" onClick={() => enterApp(false)}>
                ENTER
              </button>
              <button type="button" className="apt-secondary" onClick={() => enterApp(true)}>
                Choose a different path
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const question = questions[index]
  const total = questions.length

  return (
    <div className="ob-overlay">
      <div className="ob-content">
        <div className="ob-card-wrapper">
          <div className="ob-screen apt-screen">
            <p className="apt-kicker">Question {index + 1} of {total}</p>
            <p className="apt-role">{question.role}</p>
            <h2 className="ob-title apt-prompt">{question.prompt}</h2>
            <div className="apt-choices" role="group" aria-label={question.prompt}>
              {question.choices.map((choice, i) => (
                <button
                  key={choice.routeId}
                  type="button"
                  className="apt-choice"
                  onClick={() => choose(i)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <div className="apt-nav">
              {index > 0 && (
                <button
                  type="button"
                  className="apt-secondary"
                  onClick={() => {
                    setPicks((prev) => prev.slice(0, -1))
                    setIndex((n) => Math.max(0, n - 1))
                  }}
                >
                  Back
                </button>
              )}
              <button type="button" className="apt-secondary" onClick={skip}>
                Skip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
