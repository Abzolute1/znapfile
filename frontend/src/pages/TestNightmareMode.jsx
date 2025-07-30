import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Cpu, Fingerprint, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import nightmareSecurity from '../utils/nightmareSecurity'
import api from '../services/api'

const TestNightmareMode = () => {
  const [selectedLevel, setSelectedLevel] = useState(10)
  const [challenge, setChallenge] = useState(null)
  const [solving, setSolving] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const threatLevels = [
    { value: 0, label: 'Level 0-2: No Challenge', color: 'green' },
    { value: 3, label: 'Level 3-4: Simple Math', color: 'yellow' },
    { value: 5, label: 'Level 5-9: Basic PoW', color: 'orange' },
    { value: 10, label: 'Level 10-14: Nightmare Passive', color: 'red' },
    { value: 15, label: 'Level 15-19: Nightmare Active', color: 'red' },
    { value: 20, label: 'Level 20+: Nightmare Full', color: 'red' },
  ]

  const fetchChallenge = async () => {
    try {
      setError('')
      setResult(null)
      const response = await api.get(`/test-defense/test-challenge/${selectedLevel}`)
      setChallenge(response.data.challenge)
    } catch (err) {
      setError('Failed to fetch challenge. Make sure the backend is in DEBUG mode.')
    }
  }

  const solveChallenge = async () => {
    if (!challenge) return

    setSolving(true)
    setProgress('Starting challenge...')
    setResult(null)

    try {
      let solution = ''

      // Set up progress callback
      window.nightmareProgressCallback = (prog) => {
        setProgress(prog)
      }

      if (challenge.type === 'math') {
        // For testing, extract numbers from question
        const matches = challenge.question.match(/\d+/g)
        if (matches && matches.length === 2) {
          solution = String(parseInt(matches[0]) + parseInt(matches[1]))
        }
      } 
      else if (challenge.type === 'proof_of_work') {
        // Standard PoW
        const requiredPrefix = '0'.repeat(challenge.difficulty)
        let nonce = 0
        
        while (true) {
          const hash = await nightmareSecurity.hashString(challenge.challenge + nonce)
          if (hash.startsWith(requiredPrefix)) {
            solution = nonce.toString()
            break
          }
          nonce++
          if (nonce % 1000 === 0) {
            setProgress(`Solving PoW... (${(nonce/1000).toFixed(0)}k attempts)`)
          }
        }
      }
      else if (challenge.type.startsWith('nightmare')) {
        // Use nightmare security module
        solution = await nightmareSecurity.solveNightmareChallenge(challenge)
      }

      // Verify solution
      const verifyResponse = await api.post('/test-defense/verify-test-challenge', {
        challenge_id: challenge.challenge_id,
        solution: solution
      })

      setResult({
        success: verifyResponse.data.success,
        solution: solution,
        type: challenge.type
      })

    } catch (err) {
      setError('Failed to solve challenge: ' + err.message)
    } finally {
      setSolving(false)
      setProgress('')
      delete window.nightmareProgressCallback
    }
  }

  const getChallengeIcon = () => {
    if (!challenge) return <Shield className="w-8 h-8" />
    
    switch (challenge.type) {
      case 'math':
        return <Activity className="w-8 h-8" />
      case 'proof_of_work':
        return <Cpu className="w-8 h-8" />
      case 'nightmare_passive':
        return <Fingerprint className="w-8 h-8" />
      case 'nightmare_active':
      case 'nightmare_full':
        return <AlertTriangle className="w-8 h-8" />
      default:
        return <Shield className="w-8 h-8" />
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card-bg rounded-xl p-8 border border-gray-800"
        >
          <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Nightmare Mode Test Suite
          </h1>

          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-warning flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              This page is only available in development mode for testing ASR security features.
            </p>
          </div>

          {/* Threat Level Selector */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Select Threat Level</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {threatLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setSelectedLevel(level.value)}
                  className={`p-4 rounded-lg border transition ${
                    selectedLevel === level.value
                      ? 'bg-primary/20 border-primary'
                      : 'bg-dark-bg border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className={`text-sm font-medium ${
                    level.color === 'green' ? 'text-green-400' :
                    level.color === 'yellow' ? 'text-yellow-400' :
                    level.color === 'orange' ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {level.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Fetch Challenge Button */}
          <button
            onClick={fetchChallenge}
            disabled={solving}
            className="w-full mb-6 p-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            Generate Challenge for Level {selectedLevel}
          </button>

          {/* Challenge Display */}
          {challenge && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-bg rounded-lg p-6 mb-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                  {getChallengeIcon()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {challenge.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h3>
                  <p className="text-sm text-text-muted">Challenge ID: {challenge.challenge_id}</p>
                </div>
              </div>

              {/* Challenge Details */}
              <div className="space-y-2 mb-4">
                {challenge.question && (
                  <p className="text-sm"><span className="text-text-muted">Question:</span> {challenge.question}</p>
                )}
                {challenge.difficulty !== undefined && (
                  <p className="text-sm"><span className="text-text-muted">Difficulty:</span> {challenge.difficulty}</p>
                )}
                {challenge.gpu_required && (
                  <p className="text-sm text-primary">GPU acceleration enabled</p>
                )}
                {challenge.passive_checks && (
                  <p className="text-sm"><span className="text-text-muted">Passive checks:</span> {challenge.passive_checks.join(', ')}</p>
                )}
                {challenge.active_checks && (
                  <p className="text-sm"><span className="text-text-muted">Active checks:</span> {challenge.active_checks.join(', ')}</p>
                )}
                {challenge.full_attestation && (
                  <p className="text-sm text-warning">Full environment attestation required</p>
                )}
              </div>

              {/* Solve Button */}
              <button
                onClick={solveChallenge}
                disabled={solving}
                className="w-full p-3 bg-primary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {solving ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Cpu className="w-5 h-5" />
                    </motion.div>
                    Solving Challenge...
                  </>
                ) : (
                  'Solve Challenge'
                )}
              </button>

              {/* Progress */}
              {progress && (
                <p className="text-sm text-text-muted mt-3 text-center">{progress}</p>
              )}
            </motion.div>
          )}

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg p-4 ${
                result.success ? 'bg-success/10 border border-success/20' : 'bg-error/10 border border-error/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-error" />
                )}
                <h3 className="font-semibold">
                  {result.success ? 'Challenge Solved!' : 'Challenge Failed'}
                </h3>
              </div>
              <div className="text-sm space-y-1">
                <p><span className="text-text-muted">Type:</span> {result.type}</p>
                <p className="break-all">
                  <span className="text-text-muted">Solution:</span> 
                  <code className="ml-2 text-xs bg-dark-bg px-2 py-1 rounded">
                    {typeof result.solution === 'string' && result.solution.length > 100 
                      ? result.solution.substring(0, 100) + '...' 
                      : result.solution}
                  </code>
                </p>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-error/10 border border-error/20 rounded-lg p-4 text-error text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Info */}
          <div className="mt-8 bg-primary/10 rounded-lg p-4">
            <h3 className="font-semibold mb-2">How Nightmare Mode Works:</h3>
            <ul className="text-sm text-text-muted space-y-1">
              <li>• <strong>Passive Mode (10-14):</strong> Collects browser fingerprints + standard PoW</li>
              <li>• <strong>Active Mode (15-19):</strong> GPU-accelerated PoW + timing checks</li>
              <li>• <strong>Full Mode (20+):</strong> All checks + iframe challenges + attestation</li>
              <li>• Designed to be invisible to legitimate users</li>
              <li>• Only activates after 10+ failed login attempts</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default TestNightmareMode