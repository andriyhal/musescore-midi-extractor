import {
    getS3ListFiles,
    deleteS3File,
    getArtistJson,
    getS3File,
} from "../services/index.js";

export const s3ListFiles = async (req, res) => {
    try {
        const files = await getS3ListFiles();

        res.json({ total: files.length ? files.length : 0, results: files });
    } catch (error) {
        console.error("Error listing S3 files:", error);
        res.status(500).json({ error: "Failed to list S3 files" });
    }
};
// const d = [
//     {
//         Key: "Anton Diabelli/00ab85b3-7d8b-49be-b728-f803c57bb98c_37830_Sonatine_Op._168_No_2.mid",
//         LastModified: "2025-07-24T13:59:56.000Z",
//         ETag: '"8002c07917c8d72123a2b3acd14475f4"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 5624,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Anton Diabelli/composer.json",
//         LastModified: "2025-07-24T13:59:56.000Z",
//         ETag: '"9a6fbb53e86e7780ae1a598ac89accf2"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 247,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Bedřich Smetana/04aa175f-f6b5-4efb-8fd4-2108e15ed6c4_26656_Die_Moldau.mid",
//         LastModified: "2025-07-24T14:00:42.000Z",
//         ETag: '"076d38b584ceb68bd3c38d7c9386ef57"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 5601,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Bedřich Smetana/composer.json",
//         LastModified: "2025-07-24T14:00:43.000Z",
//         ETag: '"e8a4ecd82b367b622ca858da3d8debb9"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 238,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Charles-Valentin Alkan/004857f0-2204-48a1-8fae-f7f90647a0e6_58924_Marche_Funebre_by_Alkan.mid",
//         LastModified: "2025-07-24T13:59:50.000Z",
//         ETag: '"2a187984f3da1d7056f93cb143455109"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 21481,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Charles-Valentin Alkan/composer.json",
//         LastModified: "2025-07-24T13:59:50.000Z",
//         ETag: '"49bcbd9809580243fc1cc22b1936a582"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 257,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Friedrich Burgmüller/02a5c796-c28d-48cb-bc87-8992eb32ca3b_23740_Burgm_ller_-_Etude_3__Pastorale.mid",
//         LastModified: "2025-07-24T14:00:25.000Z",
//         ETag: '"2b91deeb37c5f9ecde6091031c9e5123"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 3241,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Friedrich Burgmüller/composer.json",
//         LastModified: "2025-07-24T14:00:25.000Z",
//         ETag: '"fcee5ed01d6c4deacda0794ec91bbf2b"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 264,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Johann Sebastian Bach/01b2bbd6-ece1-4475-8706-3993632c0088_35759_invention_13.mid",
//         LastModified: "2025-07-24T14:00:11.000Z",
//         ETag: '"2259ec23c4ae9382f797ddefbe573f1b"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 1875,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Johann Sebastian Bach/01be87b6-8185-42a1-8c59-a61157a54cdb_41949_Organ_Sonata_No.4_in_E_minor__BWV_528_-_Johann_Sebastian_Bach.mid",
//         LastModified: "2025-07-24T14:00:17.000Z",
//         ETag: '"27c111cd5fb22325d0a07ffc10ba9225"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 9837,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Johann Sebastian Bach/048247cc-661a-48d9-96fe-8c1903088bde_15911_Aria.mid",
//         LastModified: "2025-07-24T14:00:37.000Z",
//         ETag: '"30d2def3362a94e6320f4edc99197d23"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 6470,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Johann Sebastian Bach/composer.json",
//         LastModified: "2025-07-24T14:00:38.000Z",
//         ETag: '"1e0e0f9cf291e4a4153699485f173b20"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 660,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Johann Strauss Jr./05663f47-56f2-49d6-8527-1131ff4df6d5_41821_Blue_Danube.mid",
//         LastModified: "2025-07-24T14:00:49.000Z",
//         ETag: '"b8f76a94c1dd06ed7bcb63907950aa5b"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 1465,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Johann Strauss Jr./composer.json",
//         LastModified: "2025-07-24T14:00:49.000Z",
//         ETag: '"c60a7259750bc9b124df76761e430b98"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 241,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Ludwig Van Beethoven/017db93a-e2a8-4034-a5e2-e16bdf76cb0f_64273_Sonate_No._2__1st_Movement.mid",
//         LastModified: "2025-07-24T14:00:04.000Z",
//         ETag: '"75c743c3b6eba91932688912117cdb60"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 26113,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Ludwig Van Beethoven/04435933-efb4-449f-b5f8-9bd409a841cf_46265_Sonata_No._1_in_F_minor.mid",
//         LastModified: "2025-07-24T14:00:31.000Z",
//         ETag: '"f1fb3e81658c9703be4d48ae60fe3c0a"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 8687,
//         StorageClass: "STANDARD",
//     },
//     {
//         Key: "Ludwig Van Beethoven/composer.json",
//         LastModified: "2025-07-24T14:00:31.000Z",
//         ETag: '"45a04e86e1f985a7ae89cf141562b907"',
//         ChecksumAlgorithm: ["CRC32"],
//         ChecksumType: "FULL_OBJECT",
//         Size: 451,
//         StorageClass: "STANDARD",
//     },
// ];
export const s3FileRemove = async (req, res) => {
    const { key } = req.query;
    if (!key) {
        return res.status(400).json({ error: "Key parameter is required" });
    }
    try {
        // d.map(async (i) => {
        //     await deleteS3File(i.Key);
        // });
        await deleteS3File(key);

        res.json({ message: "File deleted successfully" });
    } catch (error) {
        console.error("Error deleting S3 file:", error);
        res.status(500).json({ error: "Failed to delete S3 file" });
    }
};
export const getJsonForArtistFromS3 = async (req, res) => {
    const { artist } = req.body;
    if (!artist) {
        return res.status(400).json({ error: "Artist parameter is required" });
    }
    try {
        const json = await getArtistJson(artist);
        if (!json) {
            return res.status(404).json({ error: "Artist JSON not found" });
        }
        res.json(json);
    } catch (error) {
        console.error("Error retrieving JSON for artist from S3:", error);
        res.status(500).json({ error: "Failed to retrieve JSON for artist" });
    }
};
export const downloadS3File = async (req, res) => {
    const { s3Key, downloadBaseDir } = req.body;
    if (!s3Key) {
        return res.status(400).json({ error: "Required parameter missed" });
    }
    try {
        await getS3File(s3Key, downloadBaseDir);

        res.json({ message: "File deleted successfully" });
    } catch (error) {
        console.error("Error deleting S3 file:", error);
        res.status(500).json({ error: "Failed to delete S3 file" });
    }
};
