import mongoose from "mongoose";
import { TryCatch } from "../middlewares/error.js";
import MediaModel from "../models/Media.js";
import cloudinary from "../utils/cloudinary.js";
import ErrorHandler from "../utils/utility-class.js";

export const createMedia = TryCatch(async (req, res, next) => {
    const { payload } = req.body;

    if (!payload || !Array.isArray(payload) || payload.length === 0) {
        return next(new ErrorHandler("No media payload provided", 400));
    }

    // extract all public_ids (VERY IMPORTANT)
    const publicIds = payload.map(item => item.public_id);

    const etags = payload.map((item) => item.etag);

    try {
        // 1. Find already existing media by etag (REAL duplicate detection)
        const existingMedia = await MediaModel.find({
            etag: { $in: etags },
        }).lean();

        const existingEtags = new Set(existingMedia.map((item) => item.etag));

        // 2. Split uploaded files into duplicates and fresh files
        const duplicateFiles = payload.filter((item) =>
            existingEtags.has(item.etag)
        );

        const newFiles = payload.filter(
            (item) => !existingEtags.has(item.etag)
        );

        // 3. Delete duplicate uploads from Cloudinary immediately
        if (duplicateFiles.length > 0) {
            const duplicatePublicIds = duplicateFiles.map((item) => item.public_id);

            const duplicateCleanup = await Promise.allSettled(
                duplicatePublicIds.map((id) => cloudinary.uploader.destroy(id))
            );

            console.log("🧹 Duplicate Cloudinary Cleanup:", duplicateCleanup);
        }

        // 4. If all uploaded files were duplicates
        if (newFiles.length === 0) {
            return res.status(200).json({
                success: false,
                message: "All selected media already exists",
                duplicates: duplicateFiles,
                saved: [],
            });
        }

        const newMedia = await MediaModel.insertMany(newFiles);

        return res.status(201).json({
            success: true,
            message:
                duplicateFiles.length > 0
                    ? `${newMedia.length} media uploaded, ${duplicateFiles.length} duplicate file(s) skipped`
                    : "Media uploaded successfully",
            saved: newMedia,
            duplicates: duplicateFiles,
        });

    } catch (error) {
        // 🔥 ROLLBACK CLOUDINARY UPLOADS
        if (payload && payload.length > 0) {
            try {
                await Promise.all(
                    publicIds.map(id =>
                        cloudinary.api.delete_resources(id)
                    )
                );
            } catch (cloudinaryError) {
                console.error("Cloudinary cleanup failed:", cloudinaryError);
                error.cloudinary = cloudinaryError
            }
        }

        return next(new ErrorHandler(`Failed to save media ${error}`, 500));
    }
});

export const getMedia = TryCatch(async (req, res, next) => {

    const searchParams = req.query
    const page = parseInt(searchParams.page, 10) || 0
    const limit = parseInt(searchParams.limit, 10) || 10
    const deleteType = searchParams.deleteType
    //SD - Soft Delete,  RSD - Restore Soft Delete, PD - Permanent Delete

    let filter = {}
    if (deleteType === 'SD') {
        filter = { deletedAt: null }
    } else if (deleteType === 'PD') {
        filter = { deletedAt: { $ne: null } }
    }

    const mediaData = await MediaModel.find(filter).sort({ createdAt: -1 }).skip(page * limit).limit(limit).lean()

    const totalMedia = await MediaModel.countDocuments(filter)

    res.status(200).json({
        success: true,
        message: 'Media Fetched Successfully',
        mediaData,
        hasMore: (page + 1) * limit < totalMedia
    })
})

export const updateMediaStatus = TryCatch(async (req, res, next) => {

    const { payload } = req.body;

    const ids = payload?.ids || req.body.ids || [];
    const deleteType = payload?.deleteType || req.body.deleteType;

    if (!Array.isArray(ids) || ids.length === 0) {
        return next(new ErrorHandler('Invalid Or Empty id list', 400))
    }

    const media = await MediaModel.find({ _id: { $in: ids } }).lean()

    if (!media.length) {
        return next(new ErrorHandler('No Media Found', 404))
    }

    if (!['SD', 'RSD'].includes(deleteType)) {
        return next(new ErrorHandler('Invalid Delete Operation Deletetype should be SD or RSD', 400))
    }

    if (deleteType === 'SD') {
        await MediaModel.updateMany({ _id: { $in: ids } }, { $set: { deletedAt: new Date().toISOString() } });
    } else {
        await MediaModel.updateMany({ _id: { $in: ids } }, { $set: { deletedAt: null } });
    }

    res.status(200).json({
        success: true,
        message: `${deleteType === 'SD' ? 'Media Moved To Trash' : 'Media Restored Successfully'}`
    });
});

export const deleteMedia = TryCatch(async (req, res, next) => {

    const session = await mongoose.startSession();

    session.startTransaction();

    const { payload } = req.body;

    const ids = payload.ids || []
    const deleteType = payload.deleteType

    if (!Array.isArray(ids) || ids.length === 0) {
        return next(new ErrorHandler('Invalid Or Empty id list', 400))
    }

    const media = await MediaModel.find({ _id: { $in: ids } }).session(session).lean()

    if (!media.length) {
        return next(new ErrorHandler('No Media Found', 404))
    }

    if (deleteType !== 'PD') {
        return next(new ErrorHandler('Invalid Delete Operation Deletetype should be PD', 400))
    }

    await MediaModel.deleteMany({ _id: { $in: ids } }).session(session)

    //Delete media from cloudinary
    const publicIds = media.map(m => m.public_id)

    try {
        await cloudinary.api.delete_resources(publicIds)
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return next(error)
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
        success: true,
        message: 'Media Deleted Permanently'
    });
});