import { Bridge } from './lib/bridge'
import { Shell } from './shell'
import { AppController } from './state/app-controller'
import { BootScreen } from './components/boot-screen'
import { EasterEggs } from './lib/easter-eggs'
import { T } from './lib/strings'

const root = document.getElementById('app')
if (!root) throw new Error('Missing root element')

document.addEventListener('contextmenu', (event) => { if (!(event.target as HTMLElement).closest('.selectable')) event.preventDefault() })

const boot = new BootScreen()
const bridge = new Bridge()
await bridge.waitUntilConnected()
const controller = new AppController(bridge)
await controller.loadPreferences()
new EasterEggs(controller)
boot.setStatus(T.boot.loading)
new Shell(root, controller).mount()
bridge.notifyReady()
await controller.initialize()
boot.setStatus(T.boot.ready)
await boot.finish()