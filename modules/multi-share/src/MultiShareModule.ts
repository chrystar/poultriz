import { NativeModule, requireOptionalNativeModule } from 'expo';
import type { MultiShareModuleEvents } from './MultiShare.types';

declare class MultiShareModule extends NativeModule<MultiShareModuleEvents> {
  shareImages(imageUris: string[]): Promise<void>;
}

export default requireOptionalNativeModule<MultiShareModule>('MultiShare');
