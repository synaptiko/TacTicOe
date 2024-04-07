uniform sampler2D uParticles;
uniform vec2 uParticlesResolution;
uniform sampler2D uEmitters;
uniform vec2 uEmittersResolution;
uniform float uDelta;
varying vec2 vUv;

float oneThird = 1.0 / 3.0;
float twoThirds = 2.0 / 3.0;

int getParticleId(vec2 vUv) {
  if (vUv.y < oneThird) {
    return int((gl_FragCoord.x - 0.5) + (gl_FragCoord.y - 0.5) * float(uParticlesResolution.x));
  } else if (vUv.y < twoThirds) {
    return int((gl_FragCoord.x - 0.5) + (gl_FragCoord.y - 0.5 - (uParticlesResolution.y * oneThird)) * float(uParticlesResolution.x));
  } else {
    return int((gl_FragCoord.x - 0.5) + (gl_FragCoord.y - 0.5 - (uParticlesResolution.y * twoThirds)) * float(uParticlesResolution.x));
  }
}

vec4 getParticlePosAndAge(vec2 vUv) {
  if (vUv.y < oneThird) {
    return texture2D(uParticles, vUv);
  } else if (vUv.y < twoThirds) {
    return texture2D(uParticles, vUv - vec2(0.0, oneThird));
  } else {
    return texture2D(uParticles, vUv - vec2(0.0, twoThirds));
  }
}

vec4 getParticleVelAndMaxAge(vec2 vUv) {
  if (vUv.y < oneThird) {
    return texture2D(uParticles, vUv + vec2(0.0, oneThird));
  } else if (vUv.y < twoThirds) {
    return texture2D(uParticles, vUv);
  } else {
    return texture2D(uParticles, vUv - vec2(0.0, oneThird));
  }
}

vec4 getParticleAccAndType(vec2 vUv) {
  if (vUv.y < oneThird) {
    return texture2D(uParticles, vUv + vec2(0.0, twoThirds));
  } else if (vUv.y < twoThirds) {
    return texture2D(uParticles, vUv + vec2(0.0, oneThird));
  } else {
    return texture2D(uParticles, vUv);
  }
}

vec4 findEmitterPosAndAge(int particleId, vec4 particlePosAndAge) {
  vec4 result = particlePosAndAge;

  for (int x = 0; x < int(uEmittersResolution.x); x++) {
    for (int y = 0; y < int(uEmittersResolution.y * oneThird); y++) {
      vec4 emitterPosAndId = texture2D(uEmitters, vec2(float(x) / uEmittersResolution.x, float(y) / uEmittersResolution.y));
      vec3 emitterPos = emitterPosAndId.xyz;
      int emitterId = int(emitterPosAndId.w);

      if (emitterId == -1) {
        break;
      }

      if (emitterId == particleId) {
        result = vec4(emitterPos, 0.0);
        break;
      }
    }
  }

  return result;
}

vec4 findEmitterVelAndMaxAge(int particleId, vec4 particleVelAndMaxAge) {
  vec4 result = particleVelAndMaxAge;

  for (int x = 0; x < int(uEmittersResolution.x); x++) {
    for (int y = 0; y < int(uEmittersResolution.y * oneThird); y++) {
      int emitterId = int(texture2D(uEmitters, vec2(float(x) / uEmittersResolution.x, float(y) / uEmittersResolution.y)).w);
      vec4 emitterVelAndMaxAge = texture2D(uEmitters, vec2(float(x) / uEmittersResolution.x, float(y) / uEmittersResolution.y) + vec2(0.0, oneThird));
      vec3 emitterVel = emitterVelAndMaxAge.xyz;
      float emitterMaxAge = emitterVelAndMaxAge.w;

      if (emitterId == -1) {
        break;
      }

      if (emitterId == particleId) {
        result = vec4(emitterVel, emitterMaxAge);
      }
    }
  }

  return result;
}

vec4 findEmitterAccAndType(int particleId, vec4 particleAccAndType) {
  vec4 result = particleAccAndType;

  for (int x = 0; x < int(uEmittersResolution.x); x++) {
    for (int y = 0; y < int(uEmittersResolution.y * oneThird); y++) {
      int emitterId = int(texture2D(uEmitters, vec2(float(x) / uEmittersResolution.x, float(y) / uEmittersResolution.y)).w);
      vec4 emitterAccAndType = texture2D(uEmitters, vec2(float(x) / uEmittersResolution.x, float(y) / uEmittersResolution.y) + vec2(0.0, twoThirds));
      vec3 emitterAcc = emitterAccAndType.xyz;
      float emitterType = emitterAccAndType.w;

      if (emitterId == -1) {
        break;
      }

      if (emitterId == particleId) {
        result = vec4(emitterAcc, emitterType);
        break;
      }
    }
  }

  return result;
}

void main() {
  vec4 posAndAge = getParticlePosAndAge(vUv);
  vec4 velAndMaxAge = getParticleVelAndMaxAge(vUv);
  float age = posAndAge.w;

  if (vUv.y < oneThird) {
    float maxAge = velAndMaxAge.w;

    if (age == -1.0) {
      int id = getParticleId(vUv);

      gl_FragColor = findEmitterPosAndAge(id, posAndAge);
    } else if (age >= maxAge) {
      gl_FragColor = vec4(0, 0, 0, -1.0);
    } else {
      vec3 pos = posAndAge.xyz;
      vec3 vel = velAndMaxAge.xyz;

      gl_FragColor = vec4(pos + vel * uDelta, age + uDelta);
    }
  } else if (vUv.y < twoThirds) {
    if (age == -1.0) {
      int id = getParticleId(vUv);

      gl_FragColor = findEmitterVelAndMaxAge(id, velAndMaxAge);
    } else {
      vec3 vel = velAndMaxAge.xyz;
      float maxAge = velAndMaxAge.w;
      vec4 accAndType = getParticleAccAndType(vUv);
      vec3 acc = accAndType.xyz;

      gl_FragColor = vec4(vel + acc * uDelta, maxAge);
    }
  } else {
    vec4 accAndType = getParticleAccAndType(vUv);

    if (age == -1.0) {
      int id = getParticleId(vUv);

      gl_FragColor = findEmitterAccAndType(id, accAndType);
    } else {
      gl_FragColor = accAndType;
    }
  }
}
