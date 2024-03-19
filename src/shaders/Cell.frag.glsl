// Copy of Three.js's standard fragment shader
// Result of console.log(parameters.fragmentShader);
// Our adjustments demarcated with <TacTicOe> comments

#define STANDARD

// <TacTicOe>
varying vec2 vMyUv;
varying vec3 vMyNormal;
uniform vec4 uEdges;
uniform int uPlayer;
uniform float uPlayerFill;
// </TacTicOe>

#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

// <TacTicOe>
// SDFs from https://iquilezles.org/articles/distfunctions2d/
float sdArc(in vec2 p, in vec2 sc, in float ra, float rb) {
  p.x = abs(p.x);

  return ((sc.y * p.x > sc.x * p.y) ? length(p - sc * ra) : abs(length(p) - ra)) - rb;
}

float sdSegment(in vec2 p, in vec2 a, in vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);

    return length(pa - ba * h);
}
// </TacTicOe>

// <TacTicOe>
vec3 strokeColor = vec3(0.005);
vec3 upVector = vec3(0.0, 0.0, 1.0);
float edgeThickness = 0.033;
float edgeSmoothness = 0.01;
float symbolThickness = 0.033;
float symbolSmoothness = 0.01;

vec2 rotate(vec2 point, vec2 center, float angle) {
  float cosTheta = cos(angle);
  float sinTheta = sin(angle);
  float x = point.x - center.x;
  float y = point.y - center.y;

  return vec2(
    x * cosTheta - y * sinTheta,
    x * sinTheta + y * cosTheta
  ) + center;
}

vec2 flip(vec2 uv) {
  return vec2(1.0 - uv.x, uv.y);
}

float drawArc(vec2 position, vec2 center, float radius, float angle, float thickness, float smoothness) {
  vec2  sc = vec2(sin(angle),cos(angle));
  float d = sdArc(rotate(position, center, angle) - center, sc, radius, 0.0);

  return smoothstep(thickness * 0.5 + smoothness, thickness * 0.5, d);
}

float drawLine(vec2 position, vec2 a, vec2 b, float thickness, float smoothness) {
  float d = sdSegment(position, a, b);

  return smoothstep(thickness * 0.5 + smoothness, thickness * 0.5, d);
}

vec3 drawOSymbol(vec4 diffuseColor) {
  vec2 center = vec2(0.5, 0.5);
  float radius = 0.3;
  float angle = PI * uPlayerFill;
  vec2 rotatedUv = rotate(vMyUv, center, PI / 2.0);
  vec2 flippedUv = flip(rotatedUv);

  float outerCircle = drawArc(rotatedUv, center, radius, angle, symbolThickness, symbolSmoothness);
  float innerCircle = drawArc(flippedUv, center, radius / 1.5, angle, symbolThickness, symbolSmoothness);

  return mix(diffuseColor.rgb, strokeColor, max(outerCircle, innerCircle));
}

vec3 drawXSymbol(vec4 diffuseColor) {
  vec2 center = vec2(0.5, 0.5);
  float radius = 0.3;
  vec2 rotatedUv = rotate(vMyUv, center, PI / 2.0);

  float line1 = drawLine(rotatedUv, vec2(center.x - radius, center.y - radius), vec2(center.x + radius, center.y + radius), symbolThickness, symbolSmoothness);
  float line2 = drawLine(rotatedUv, vec2(center.x - radius, center.y + radius), vec2(center.x + radius, center.y - radius), symbolThickness, symbolSmoothness);

  return mix(diffuseColor.rgb, strokeColor, max(line1, line2));
}

vec3 drawEdges(vec4 diffuseColor) {
  float thickness = edgeThickness * 0.5;
  float smoothness = edgeSmoothness;
  float blend = 1.0;

  if (uEdges.x == 1.0) {
    blend *= smoothstep(thickness, thickness + smoothness, vMyUv.x);
  }
  if (uEdges.y == 1.0) {
    blend *= smoothstep(thickness, thickness + smoothness, vMyUv.y);
  }
  if (uEdges.z == 1.0) {
    blend *= smoothstep(thickness, thickness + smoothness, 1.0 - vMyUv.x);
  }
  if (uEdges.w == 1.0) {
    blend *= smoothstep(thickness, thickness + smoothness, 1.0 - vMyUv.y);
  }

  return mix(diffuseColor.rgb, strokeColor, 1.0 - blend);
}

vec4 drawCell(vec4 diffuseColor) {
  vec4 newDiffuseColor = diffuseColor;

  if (dot(vMyNormal, upVector) > 0.99) {
    // render edges & player symbols on the top face
    newDiffuseColor.rgb = drawEdges(newDiffuseColor);

    if (uPlayer == 1) {
      newDiffuseColor.rgb = drawXSymbol(newDiffuseColor);
      // newDiffuseColor.rgb = drawOSymbol(newDiffuseColor);
    } else if (uPlayer == 2) {
      newDiffuseColor.rgb = drawOSymbol(newDiffuseColor);
    }
  } else {
    // render side faces with a darker color
    newDiffuseColor.rgb = diffuseColor.rgb * 0.125;
  }

  return newDiffuseColor;
}
// </TacTicOe>

void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
  // <TacTicOe>
  diffuseColor = drawCell(diffuseColor);
  // </TacTicOe>
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}
