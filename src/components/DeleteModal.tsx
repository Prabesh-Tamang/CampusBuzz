'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  itemName: string
  loading?: boolean
  deleteText?: string
}

export default function DeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  itemName, 
  loading = false,
  deleteText = 'Delete'
}: DeleteModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-dark-card border border-border rounded-2xl p-6 max-w-sm w-full"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 mb-4 mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            
            <h3 className="text-xl font-bold text-white text-center mb-2">{title}</h3>
            <p className="text-muted-foreground text-center mb-6">
              Are you sure you want to {deleteText.toLowerCase()} "{itemName}"? This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  deleteText
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
