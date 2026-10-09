import { registerWebModule, NativeModule } from 'expo';

// MultiShareModule is not available on the web platform.
class MultiShareModule extends NativeModule<{}> {}

export default registerWebModule(MultiShareModule, 'MultiShareModule');
