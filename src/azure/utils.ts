/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ResourceManagementClient } from "@azure/arm-resources";
import { SqlManagementClient } from "@azure/arm-sql";
import { SubscriptionClient } from "@azure/arm-subscriptions";
import { PagedAsyncIterableIterator } from "@azure/core-paging";
import * as path from "path";
import * as os from "os";
import * as vscode from "vscode";
import { AzureAuthType, IToken } from "../models/contracts/azure";
import * as Constants from "./constants";
import { TokenCredentialWrapper } from "./credentialWrapper";

const configAzureAD = "azureActiveDirectory";

/**
 * Helper method to convert azure results that comes as pages to an array
 * @param pages azure resources as pages
 * @param convertor a function to convert a value in page to the expected value to add to array
 * @returns array or Azure resources
 */
export async function getAllValues<T, TResult>(
    pages: PagedAsyncIterableIterator<T>,
    convertor: (input: T) => TResult | undefined,
): Promise<TResult[]> {
    let values: TResult[] = [];
    let newValue = await pages.next();
    while (!newValue.done) {
        values.push(convertor(newValue.value)!);
        newValue = await pages.next();
    }
    return values;
}

export type SubscriptionClientFactory = (token: IToken) => SubscriptionClient;
export function defaultSubscriptionClientFactory(token: IToken): SubscriptionClient {
    return new SubscriptionClient(new TokenCredentialWrapper(token));
}

export type ResourceManagementClientFactory = (
    token: IToken,
    subscriptionId: string,
) => ResourceManagementClient;
export function defaultResourceManagementClientFactory(
    token: IToken,
    subscriptionId: string,
): ResourceManagementClient {
    return new ResourceManagementClient(new TokenCredentialWrapper(token), subscriptionId);
}

export type SqlManagementClientFactory = (
    token: IToken,
    subscriptionId: string,
) => SqlManagementClient;
export function defaultSqlManagementClientFactory(
    token: IToken,
    subscriptionId: string,
): SqlManagementClient {
    return new SqlManagementClient(new TokenCredentialWrapper(token), subscriptionId);
}

function getConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(Constants.extensionConfigSectionName);
}

export function getAzureActiveDirectoryConfig(): AzureAuthType {
    let config = getConfiguration();
    if (config) {
        const val: string | undefined = config.get(configAzureAD);
        if (val) {
            return AzureAuthType[val];
        }
    } else {
        return AzureAuthType.AuthCodeGrant;
    }
}

export function getEnableSqlAuthenticationProviderConfig(): boolean {
    const config = getConfiguration();
    if (config) {
        const val: boolean | undefined = config.get(Constants.sqlAuthProviderSection);
        if (val !== undefined) {
            return val;
        }
    }
    return true; // default setting
}

export function getEnableConnectionPoolingConfig(): boolean {
    const config = getConfiguration();
    if (config) {
        const val: boolean | undefined = config.get(Constants.enableConnectionPoolingSection);
        if (val !== undefined) {
            return val;
        }
    }
    return false; // default setting
}

export function getAppDataPath(): string {
    let platform = process.platform;
    switch (platform) {
        case "win32":
            return (
                process.env["APPDATA"] ||
                path.join(process.env["USERPROFILE"]!, "AppData", "Roaming")
            );
        case "darwin":
            return path.join(os.homedir(), "Library", "Application Support");
        case "linux":
            return process.env["XDG_CONFIG_HOME"] || path.join(os.homedir(), ".config");
        default:
            throw new Error("Platform not supported");
    }
}
