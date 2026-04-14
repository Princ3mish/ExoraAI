
import { motion } from 'framer-motion'
import { Button } from './components/ui/button'

function App() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 tracking-tight">
          Exora AI
        </h1>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Button onClick={() => alert('Get Started Configured Successfully!')} className="shadow-lg shadow-blue-500/40 text-md px-8 py-6 rounded-full font-bold">
          Get Started
        </Button>
      </motion.div>
    </div>
  )
}

export default App
