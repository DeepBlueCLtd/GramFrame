/**
 * A two-or-more option segmented control.
 *
 * The panel needs three of these — tall pins or mini, normal symbols or large,
 * and nothing stops a fourth — and they are all the same object: a short row of
 * mutually exclusive choices where both options are worth showing, because the
 * pair is the question. A checkbox can only show one of them and leaves the
 * analyst to infer the other, which is what the pin toggle used to do.
 *
 * Rendered as buttons in a `radiogroup` rather than as radio inputs: the
 * styling is a joined row with one filled segment, which native radios cannot
 * be talked into, and `aria-checked` on a `radio` role says the same thing to a
 * screen reader.
 */

/**
 * The control's handle.
 * @typedef {Object} SegmentedControl
 * @property {HTMLDivElement} element - The control, ready to mount
 * @property {function(*): void} setValue - Show this option as chosen
 * @property {function(boolean, string=): void} setEnabled - Enable or disable the whole control
 */

/**
 * Build a segmented control.
 * @template T
 * @param {Array<{value: T, label: string}>} options - The choices, in display order
 * @param {string} groupLabel - Accessible name for the group
 * @param {function(T): void} onChange - Called with the chosen value
 * @returns {SegmentedControl} The control and its handle
 */
export function createSegmented(options, groupLabel, onChange) {
  const element = document.createElement('div')
  element.className = 'gram-frame-segmented'
  element.setAttribute('role', 'radiogroup')
  element.setAttribute('aria-label', groupLabel)

  /** @type {HTMLButtonElement[]} */
  const buttons = options.map(option => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'gram-frame-segmented-option'
    button.setAttribute('role', 'radio')
    button.setAttribute('aria-checked', 'false')
    button.textContent = option.label
    button.addEventListener('click', event => {
      event.preventDefault()
      if (!button.disabled) {
        onChange(option.value)
      }
    })
    element.appendChild(button)
    return button
  })

  return {
    element,

    setValue(value) {
      options.forEach((option, index) => {
        const chosen = option.value === value
        buttons[index].classList.toggle('gram-frame-segmented-selected', chosen)
        buttons[index].setAttribute('aria-checked', chosen ? 'true' : 'false')
      })
    },

    setEnabled(enabled, reason) {
      element.classList.toggle('gram-frame-segmented-disabled', !enabled)
      // The reason rides the control rather than being printed beside it: the
      // row is 46px of label and a 24px control, with nowhere to put a
      // sentence, and "why is this greyed out" is a hover question.
      element.title = enabled ? '' : (reason || '')
      buttons.forEach(button => { button.disabled = !enabled })
    }
  }
}
