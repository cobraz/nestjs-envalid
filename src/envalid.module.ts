import { DynamicModule, Module } from '@nestjs/common';
import {
  CleanOptions,
  CleanedEnvAccessors,
  ValidatorSpec,
  customCleanEnv,
} from 'envalid';
import { ENVALID } from './envalid.constants.js';
import { applyDefaultMiddleware } from './middleware.js';

export type Validators<T = unknown> = {
  [K in keyof T]: ValidatorSpec<T[K]>;
};

export interface MakeValidatorsResult<T = unknown> {
  _specs: Validators<T>;
  values: T;
}

export function makeValidators<T>(
  specs: Validators<T>,
): MakeValidatorsResult<T> {
  return {
    _specs: specs,
    values: specs as unknown as T,
  };
}

export type Static<T extends MakeValidatorsResult> = Readonly<
  T['values'] & CleanedEnvAccessors
>;

export interface EnvalidModuleConfig<T> {
  // An object containing your env vars (default is `process.env`)
  environment?: unknown;

  /**
   * Envalid validators
   * See: https://github.com/af/envalid#api
   */
  validators: Validators<T> | MakeValidatorsResult<T>;

  /**
   * Envalid options
   * See: https://github.com/af/envalid
   */
  options?: CleanOptions<T>;

  /**
   * If "true", registers `ConfigModule` as a global module.
   * See: https://docs.nestjs.com/modules#global-modules
   */
  isGlobal?: boolean;

  /**
   * use dotenv to fill process.env
   * See: https://github.com/motdotla/dotenv
   */
  useDotenv?: boolean;

  /**
   * A function that applies transformations to the cleaned env object
   */
  applyMiddleware?: (cleaned: T, rawEnv: unknown) => unknown;
}

@Module({})
export class EnvalidModule {
  static async forRoot<T>(
    config: EnvalidModuleConfig<T>,
  ): Promise<DynamicModule> {
    if (config.useDotenv) {
      const dotenv = await import('dotenv');
      dotenv.config();
    }

    const {
      isGlobal,
      environment = process.env,
      options,
      applyMiddleware = applyDefaultMiddleware,
    } = config;
    let { validators } = config;

    if ('_specs' in validators) {
      validators = validators._specs;
    }

    const providers = [
      {
        provide: ENVALID,
        useValue: customCleanEnv(
          environment,
          validators,
          applyMiddleware,
          options,
        ),
      },
    ];

    return {
      global: isGlobal,
      module: EnvalidModule,
      exports: providers,
      providers,
    };
  }
}
