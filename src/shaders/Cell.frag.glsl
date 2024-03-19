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
float drawArc(vec2 position, vec2 center, float radius, float startAngle, float endAngle, float thickness, float smoothness) {
  vec2 direction = position - center;
  float distance = length(direction);
  float angle = atan(direction.y, direction.x);

  if (angle < 0.0)
    angle += 2.0 * PI; // Adjust angle to be in [0, 2*PI]

  float inArc = step(startAngle, angle) * step(angle, endAngle);

  // Calculate inner and outer edge of the arc
  float innerEdge = radius - thickness * 0.5;
  float outerEdge = radius + thickness * 0.5;

  // Apply smoothness on both inner and outer edges
  float alpha = inArc * (smoothstep(innerEdge - smoothness, innerEdge, distance) - smoothstep(outerEdge, outerEdge + smoothness, distance));

  return alpha;
}

vec4 drawCell(vec4 diffuseColor) {
  vec3 strokeColor = vec3(0.005);
  vec3 sideColor = diffuseColor.rgb * 0.125;
  vec4 newDiffuseColor = diffuseColor;
  vec3 upVector = vec3(0.0, 0.0, 1.0);

  if (dot(vMyNormal, upVector) > 0.99) {
    float edgeWidth = 0.03;
    float edgeTransition = 0.01;
    float edgeStart = edgeWidth - edgeTransition;
    float edgeBlend = 1.0;

    if (uEdges.x == 1.0) {
      edgeBlend *= smoothstep(edgeStart, edgeWidth, vMyUv.x);
    }
    if (uEdges.y == 1.0) {
      edgeBlend *= smoothstep(edgeStart, edgeWidth, vMyUv.y);
    }
    if (uEdges.z == 1.0) {
      edgeBlend *= smoothstep(edgeStart, edgeWidth, 1.0 - vMyUv.x);
    }
    if (uEdges.w == 1.0) {
      edgeBlend *= smoothstep(edgeStart, edgeWidth, 1.0 - vMyUv.y);
    }

    newDiffuseColor.rgb = mix(newDiffuseColor.rgb, strokeColor, 1.0 - edgeBlend);

    if (uPlayer == 1 || uPlayer == 2) {
      vec2 center = vec2(0.5, 0.5);
      float radius = 0.3;
      float startAngle = uPlayer == 1 ? PI / 2.0 : PI;
      float endAngle = (uPlayer == 1 ? PI * 1.5 : PI * 2.5) * uPlayerFill;
      float thickness = 0.05;
      float smoothness = 0.01 / 2.0;

      float alpha = drawArc(vMyUv, center, radius, startAngle, endAngle, thickness, smoothness);
      alpha = max(alpha, drawArc(vMyUv, center, radius / 1.5, startAngle, endAngle, thickness, smoothness));

      newDiffuseColor.rgb = mix(newDiffuseColor.rgb, strokeColor, alpha);
    }
  } else {
    newDiffuseColor.rgb = sideColor;
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
