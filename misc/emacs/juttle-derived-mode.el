;; Simple major mode for Juttle files based on js-mode.

;; To use, place this file in your site-lisp directory and add the
;; following to your .emacs:

;; (add-to-list 'auto-mode-alist '("\\.juttle\\'" . juttle-derived-mode))
;; (autoload 'juttle-derived-mode "juttle-derived-mode" "Juttle mode" t)

;; To use the compile-hook to execute juttle programs, you need to
;; specify the directory containing the juttle executable program and
;; the name of the program. The default of juttle-run-prog is probably
;; correct, but the default for juttle-run-dir should be customized
;; for your environment, using something like:
;; (setq juttle-run-dir "/home/<user>/src/juttle/bin")

(defvar juttle-run-dir "")
(defvar juttle-run-prog "demo")

(defvar juttle-derived-mode-hook nil "hooks")

(require 'compile)
(add-hook 'juttle-derived-mode-hook
          (lambda ()
            (set (make-local-variable 'compile-command)
                 (let ((file (file-name-nondirectory buffer-file-name)))
                   (format "%s %s"
                           (concat (file-name-as-directory juttle-run-dir) juttle-run-prog)
                           file)))))

(defvar juttle-keywords '("const"
                          "else"
                          "error"
                          "if"
                          "return"
                          "var"))

(defvar juttle-storage '("function"
                         "reducer"
                         "sub"))

(defvar juttle-procs '("batch"
                       "dropped"
                       "emit"
                       "export"
                       "filter"
                       "head"
                       "import"
                       "input"
                       "join"
                       "keep"
                       "pace"
                       "pass"
                       "sequence"
                       "put"
                       "read"
                       "reduce"
                       "remove"
                       "skip"
                       "sort"
                       "split"
                       "tail"
                       "unbatch"
                       "uniq"
                       "view"
                       "write"))

(defvar juttle-constants '("false"
                           "null"
                           "true"))

(defvar juttle-font-lock-defaults
  `((
     ( ,(regexp-opt juttle-procs 'symbols) . font-lock-builtin-face)
     ( ,(regexp-opt juttle-keywords 'symbols) . font-lock-keyword-face)
     ( ,(regexp-opt juttle-constants 'symbols) . font-lock-constant-face)
     ( ,(regexp-opt juttle-storage 'symbols) . font-lock-builtin-face)
     ))
  )
(define-derived-mode juttle-derived-mode js-mode
  "juttle-derived-mode"
  "Juttle mode based on js-mode"
  (setq font-lock-defaults juttle-font-lock-defaults)
                                        ;  (font-lock-add-keywords nil '("put" "sub"))
  )

(provide 'juttle-derived-mode)
