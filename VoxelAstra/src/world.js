import * as THREE from "../node_modules/three/build/three.module.js";
import { Scene } from "./scene.js";


// The are the actions the AI will actually perform
export class World extends Scene {

    remove_object(objectDetails) {
        const { objectName } = objectDetails;
        const object = this.room.getObjectByName(objectName);
        if (object) {
            this.room.remove(object);
        }
    }

    addObjectWithAnimation(initialAttributes) {
        const { objectName, objectType, material, color, scale, position, rotation } = initialAttributes;

        // Calculate the height of the object and set the starting position
        const height = scale.y;
        const startY = 3 + height / 2;
        const targetY = position.y;

        // Add the object at the starting position
        this.add_object({
            ...initialAttributes,
            position: { ...position, y: startY }
        });

        let currentY = startY;

        // Animate the object moving down to its target position
        const interval = setInterval(() => {
            currentY -= 0.01;

            // Modify the object's position
            this.modify_object({
                objectName: objectName,
                position: {
                    x: position.x,
                    y: currentY,
                    z: position.z
                }
            });

            // Check if the object has reached its target position
            if (currentY <= targetY) {
                clearInterval(interval);
            }
        }, 10); // Adjust for smoother animation

        return { success: true };
    }

    modify_material(object, color, materialType) {
        let mat;
        const materialColor = new THREE.Color(color.r / 255, color.g / 255, color.b / 255);

        const materialOptions = {
            'plastic': new THREE.MeshPhongMaterial({ color: materialColor }),
            'glass': new THREE.MeshPhysicalMaterial({
                color: materialColor, transparent: true, opacity: 0.5, reflectivity: 0.9,
                envMap: this.envmap, envMapIntensity: 1, refractionRatio: 0.98, roughness: 0.1,
                metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1, transmission: 1,
                ior: 1.1, side: THREE.DoubleSide
            }),
            'metal': new THREE.MeshStandardMaterial({ color: materialColor, metalness: 0.8, roughness: 0.3 }),
            'transparent': new THREE.MeshPhongMaterial({ color: materialColor, transparent: true, opacity: 0.5 })
        };

        mat = materialOptions[materialType] || new THREE.MeshPhongMaterial({ color: materialColor });
        object.material = mat;
    }

    modify_object(objectDetails) {
        const { objectName, color, material, scale, position, rotation } = objectDetails;
        const object = this.room.getObjectByName(objectName);
        if (!object) {
            console.error(`Object with name ${objectName} not found.`);
            return;
        }

        if (color) this.modify_material(object, color, material || 'default');
        if (scale) object.scale.set(scale.x, scale.y, scale.z);
        if (position) {
            object.position.set(position.x, position.y, position.z);
            if (position.y < object.scale.y) object.material.clippingPlanes = [this.clippingPlane];
        }
        if (rotation) object.rotation.set(rotation.x, rotation.y, rotation.z);

        object.updateMatrix();
    }

    add_object(objectDetails) {
        const { objectName, objectType, material, color, scale, position, rotation } = objectDetails;

        const geometryTypes = {
            'sphere': new THREE.SphereGeometry(1, 32, 32),
            'cube': new THREE.BoxGeometry(1, 1, 1),
            'cylinder': new THREE.CylinderGeometry(1, 1, 1, 32),
            'plane': new THREE.PlaneGeometry(1, 1)
            // Add more geometries for other object types if needed
        };

        let geometry = geometryTypes[objectType] || new THREE.BoxGeometry(1, 1, 1); // Default to cube if type not found
        let mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial());
        this.modify_material(mesh, color, material);

        mesh.name = objectName;
        mesh.scale.set(scale.x, scale.y, scale.z);
        mesh.position.set(position.x, position.y, position.z);
        mesh.rotation.set(rotation.x, rotation.y, rotation.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.room.add(mesh);

        return { success: true };
    }
}