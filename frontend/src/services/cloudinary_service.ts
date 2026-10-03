// src/backend/services/cloudinary_service.ts

export const cloudinaryService = {
    uploadImage: async (file: File): Promise<string> => {
        // Fetch variables from your .env file
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME; 
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            console.error("Missing Cloudinary .env variables");
            throw new Error("Cloudinary configuration is missing.");
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('cloud_name', cloudName);


        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Cloudinary upload failed');
            }
            
            const data = await response.json();
            return data.secure_url; // This is the live, secure HTTPS URL of the uploaded image
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            throw error;
        }
    }
};